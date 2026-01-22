import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AuthConfig } from '../interfaces/mapping-config.interface';

export interface AuthProvider {
  inject(
    requestConfig: any,
    authConfig: AuthConfig,
    context?: any,
  ): Promise<any>;
}

@Injectable()
export class AuthStrategyFactory {
  getProvider(type: string): AuthProvider {
    switch (type.toLowerCase()) {
      case 'basic':
        return new BasicAuthProvider();
      case 'api-key':
        return new ApiKeyAuthProvider();
      case 'bearer':
        return new BearerAuthProvider();
      case 'passthrough':
        return new PassthroughAuthProvider();
      case 'oauth2':
        return new OAuth2Provider(); // Placeholder
      case 'none':
      default:
        return new NoAuthProvider();
    }
  }
}

export class PassthroughAuthProvider implements AuthProvider {
  async inject(
    requestConfig: any,
    authConfig: AuthConfig,
    context?: any,
  ): Promise<any> {
    const authHeader =
      context?.headers?.['authorization'] ||
      context?.headers?.['Authorization'];
    if (authHeader) {
      requestConfig.headers = {
        ...requestConfig.headers,
        Authorization: authHeader,
      };
    }
    return requestConfig;
  }
}

export class BearerAuthProvider implements AuthProvider {
  private static tokenCache: Map<string, { token: string; expiresAt: number }> =
    new Map();

  async inject(
    requestConfig: any,
    authConfig: AuthConfig,
    context?: any,
  ): Promise<any> {
    const headerName = authConfig.headerName || 'Authorization';
    const tokenPrefix = authConfig.tokenPrefix || 'Bearer ';

    // 1. Prefer explicitly passed incomingToken (Passthrough)
    let token = context?.incomingToken;

    // 2. Fallback to static token in config
    if (!token && authConfig.token) {
      token = authConfig.token;
    }

    // 3. Fallback to Dynamic Fetching (Auto-Generate)
    if (!token && authConfig.tokenUrl) {
      token = await this.getDynamicToken(authConfig);
    }

    if (!token) {
      throw new Error(
        'Bearer token missing in request and no fallback/generation configured',
      );
    }

    requestConfig.headers = {
      ...requestConfig.headers,
      [headerName]: `${tokenPrefix}${token}`,
    };
    return requestConfig;
  }

  private async getDynamicToken(config: AuthConfig): Promise<string> {
    const cacheKey = config.tokenUrl + (config.clientId || '');
    const cached = BearerAuthProvider.tokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    try {
      // Perform login/token request
      const response = await axios.post(
        config.tokenUrl,
        config.loginPayload || config.credentials || {},
      );

      // Support multiple response formats: access_token, accessToken, token, or data.token
      const token =
        response.data.accessToken ||
        response.data.access_token ||
        response.data.token ||
        response.data.data?.token;

      if (!token) {
        throw new Error(`Token not found in response from ${config.tokenUrl}`);
      }

      const expiresIn = response.data.expires_in || 3600;
      BearerAuthProvider.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + expiresIn * 1000 - 60000, // Buffer 1 min
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to generate bearer token: ${error.message}`);
    }
  }
}
export class NoAuthProvider implements AuthProvider {
  async inject(
    requestConfig: any,
    authConfig: AuthConfig,
    context?: any,
  ): Promise<any> {
    return requestConfig;
  }
}

export class BasicAuthProvider implements AuthProvider {
  async inject(
    requestConfig: any,
    authConfig: AuthConfig,
    context?: any,
  ): Promise<any> {
    const token = Buffer.from(
      `${authConfig.username}:${authConfig.password}`,
    ).toString('base64');
    requestConfig.headers = {
      ...requestConfig.headers,
      Authorization: `Basic ${token}`,
    };
    return requestConfig;
  }
}

export class ApiKeyAuthProvider implements AuthProvider {
  async inject(requestConfig: any, authConfig: AuthConfig): Promise<any> {
    // Assuming header-based API Key for now
    const keyName = authConfig.keyName || 'X-API-KEY';
    requestConfig.headers = {
      ...requestConfig.headers,
      [keyName]: authConfig.keyValue,
    };
    return requestConfig;
  }
}

export class OAuth2Provider implements AuthProvider {
  private tokenCache: { [key: string]: { token: string; expiresAt: number } } =
    {};

  async inject(requestConfig: any, authConfig: AuthConfig): Promise<any> {
    const cacheKey = `${authConfig.tokenUrl}-${authConfig.clientId}`;
    const cached = this.tokenCache[cacheKey];
    const now = Date.now();

    let token = cached?.token;

    if (!token || cached.expiresAt <= now) {
      // Fetch new token
      try {
        // Assuming Client Credentials Flow for service-to-service
        const response = await axios.post(
          authConfig.tokenUrl,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: authConfig.clientId,
            client_secret: authConfig.clientSecret,
            scope: authConfig.scope || '',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );

        token = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600; // Default 1 hour
        this.tokenCache[cacheKey] = {
          token,
          expiresAt: now + expiresIn * 1000 - 60000, // Buffer 1 minute
        };
      } catch (error) {
        throw new Error(`Failed to obtain OAuth2 token: ${error.message}`);
      }
    }

    requestConfig.headers = {
      ...requestConfig.headers,
      Authorization: `Bearer ${token}`,
    };
    return requestConfig;
  }
}
