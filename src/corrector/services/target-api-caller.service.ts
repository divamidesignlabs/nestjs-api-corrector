import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TargetApiConfig } from '../interfaces/mapping-config.interface';

@Injectable()
export class TargetApiCaller {
  private readonly logger = new Logger(TargetApiCaller.name);

  constructor(private readonly httpService: HttpService) {}

  async call(
    config: TargetApiConfig,
    payload: any,
    headers: any = {},
  ): Promise<any> {
    const requestConfig = {
      method: config.method,
      url: config.url,
      data: payload,
      headers: { ...config.headers, ...headers },
      params: config.queryParams, // Inject query params from config
    };

    this.logger.debug(`Calling Target API: ${config.method} ${config.url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request(requestConfig),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Target API call failed: ${error.message}`,
        error.response?.data,
      );
      throw error;
    }
  }
}
