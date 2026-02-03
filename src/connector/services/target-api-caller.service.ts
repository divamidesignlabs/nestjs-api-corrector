import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { TargetApiConfig } from '../interfaces/mapping-config.interface';
import { MESSAGES } from '../constants';

@Injectable()
export class TargetApiCaller {

  constructor(private readonly httpService: HttpService) {}

  async call(
    config: TargetApiConfig,
    payload: any,
    headers: Record<string, string> = {},
  ): Promise<any> {
    const requestConfig = {
      method: config.method,
      url: config.url,
      data: payload as Record<string, any>,
      headers: { ...config.headers, ...headers },
      params: config.queryParams, // Inject query params from config
    };



    try {
      const response = await firstValueFrom(
        this.httpService.request<any>(requestConfig),
      );
      return response.data;
    } catch (error: any) {
      const axiosError = error as {
        message?: string;
        response?: { data: any };
      };

      throw error;
    }
  }
}
