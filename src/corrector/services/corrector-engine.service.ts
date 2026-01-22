import { Injectable, Logger } from '@nestjs/common';
import { TransformerService } from './transformer.service';
import { TargetApiCaller } from './target-api-caller.service';
import { AuthStrategyFactory } from '../strategies/auth.strategy';
import { MappingConfig } from '../interfaces/mapping-config.interface';

@Injectable()
export class CorrectorEngine {
  private readonly logger = new Logger(CorrectorEngine.name);

  constructor(
    private readonly transformer: TransformerService,
    private readonly apiCaller: TargetApiCaller,
    private readonly authFactory: AuthStrategyFactory,
  ) {}

  async execute(
    mapping: MappingConfig,
    sourcePayload: any,
    context?: {
      method: string;
      queryParams: any;
      incomingToken?: string;
      headers?: any;
    },
  ): Promise<any> {
    this.logger.log(`Executing correction for mapping: ${mapping.id}`);

    // DYNAMIC OVERRIDES
    const effectiveMethod = context?.method || mapping.targetApi.method;
    const effectiveQueryParams = {
      ...mapping.targetApi.queryParams,
      ...context?.queryParams,
    };

    // 1. Transform Request
    this.logger.debug('Transforming request payload...');
    let targetPayload: any;

    if (
      !mapping.requestMapping ||
      !mapping.requestMapping.mappings ||
      mapping.requestMapping.mappings.length === 0
    ) {
      // Passthrough Mode
      targetPayload = sourcePayload;
    } else {
      targetPayload = this.transformer.transform(
        sourcePayload,
        mapping.requestMapping,
      );
    }

    // Ensure payload exists for POST/PUT if undefined
    if (
      targetPayload === undefined &&
      ['POST', 'PUT', 'PATCH'].includes(effectiveMethod)
    ) {
      targetPayload = {};
    }

    // 2. Prepare Auth
    let requestConfig = { headers: {} };
    if (mapping.authConfig) {
      this.logger.debug(`Injecting auth strategy: ${mapping.authConfig.type}`);
      const authProvider = this.authFactory.getProvider(
        mapping.authConfig.type,
      );
      requestConfig = await authProvider.inject(
        requestConfig,
        mapping.authConfig,
        context,
      );
    }

    // 3. Call Target API
    this.logger.debug(`Calling target API (${effectiveMethod})...`);
    let targetResponse;
    const effectiveTargetApi = {
      ...mapping.targetApi,
      method: effectiveMethod as any,
      queryParams: effectiveQueryParams,
    };

    try {
      targetResponse = await this.apiCaller.call(
        effectiveTargetApi,
        targetPayload,
        requestConfig.headers,
      );
    } catch (error) {
      this.logger.warn(`Target API call failed: ${error.message}`);

      if (mapping.errorMapping) {
        this.logger.debug('Applying error mapping...');
        const errorSource = error.response?.data || {};

        // Ensure error context has basic info if nothing from API
        if (Object.keys(errorSource).length === 0) {
          errorSource.message = error.message;
          errorSource.status = error.response?.status || 'UNKNOWN';
        }

        const transformedError = this.transformer.transform(
          errorSource,
          mapping.errorMapping,
        );
        return transformedError;
      }

      throw error;
    }

    // 4. Transform Response
    this.logger.debug('Transforming response payload...');
    const finalResponse = mapping.responseMapping
      ? this.transformer.transform(
          targetResponse,
          mapping.responseMapping,
          mapping.transforms,
        )
      : targetResponse;

    return finalResponse;
  }
}
