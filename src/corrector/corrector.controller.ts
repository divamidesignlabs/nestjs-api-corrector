import {
  Controller,
  Post,
  Body,
  Param,
  Logger,
  All,
  Req,
  Query,
  RequestMethod,
} from '@nestjs/common';
import { Request } from 'express';
import { CorrectorEngine } from './services/corrector-engine.service';
import { MappingRegistryService } from './services/mapping-registry.service';

@Controller('corrector')
export class CorrectorController {
  private readonly logger = new Logger(CorrectorController.name);

  constructor(
    private readonly correctorEngine: CorrectorEngine,
    private readonly mappingRegistry: MappingRegistryService,
  ) {}

  @All(':mappingId')
  async executeCorrection(
    @Param('mappingId') mappingId: string,
    @Body() sourcePayload: any,
    @Req() request: Request,
    @Query() queryParams: any,
  ) {
    this.logger.log(
      `Received ${request.method} request for mapping ID: ${mappingId}`,
    );

    // 1. Fetch Mapping Configuration
    const mapping = await this.mappingRegistry.findByIdOrName(mappingId);

    // 2. Execute with dynamic context (Method, Query, Headers)
    const incomingHeaders = request.headers;
    let incomingToken: string | undefined = undefined;
    const authHeader = incomingHeaders['authorization'];

    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.toLowerCase().startsWith('bearer ')
    ) {
      incomingToken = authHeader.substring(7); // Remove 'Bearer '
    }

    this.logger.debug(
      `Extracted incomingToken: ${incomingToken ? 'PRESENT' : 'MISSING'}`,
    );

    return this.correctorEngine.execute(mapping.mappingConfig, sourcePayload, {
      method: request.method as any,
      queryParams: queryParams,
      headers: incomingHeaders,
      incomingToken,
    });
  }
}
