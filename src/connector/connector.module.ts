import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConnectorEngine } from './services/connector-engine.service';
import { TransformerService } from './services/transformer.service';
import { TargetApiCaller } from './services/target-api-caller.service';
import { AuthStrategyFactory } from './strategies/auth.strategy';
import { MappingRegistryService } from './services/mapping-registry.service';
import { ConnectorController } from './connector.controller';
import { MAPPING_REPOSITORY } from './interfaces/mapping-repository.interface';
import { ConnectorModuleOptions } from './interfaces/connector-module-options.interface';
import { CONNECTOR_OPTIONS, MESSAGES } from './constants';

@Global()
@Module({})
export class ConnectorModule {
  static forRoot(options: ConnectorModuleOptions): DynamicModule {
    const providers: Provider[] = [
      ...this.getCoreProviders(),
      { provide: CONNECTOR_OPTIONS, useValue: options },
      this.getRepositoryProvider(options),
    ];
    return this.assembleModule(providers);
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<ConnectorModuleOptions> | ConnectorModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const providers: Provider[] = [
      ...this.getCoreProviders(),
      {
        provide: CONNECTOR_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: MAPPING_REPOSITORY,
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          if (config.mappingRepository) return config.mappingRepository;
          if (config.mappingRepositoryFactory) {
            return config.mappingRepositoryFactory.useFactory(
              ...(config.mappingRepositoryFactory.inject || []),
            );
          }
          throw new Error(MESSAGES.ERROR.REPOSITORY_REQUIRED);
        },
        inject: options.inject || [],
      },
    ];
    return this.assembleModule(providers);
  }

  private static getCoreProviders(): Provider[] {
    return [
      ConnectorEngine,
      TransformerService,
      TargetApiCaller,
      AuthStrategyFactory,
      MappingRegistryService,
    ];
  }

  private static getRepositoryProvider(options: ConnectorModuleOptions): Provider {
    if (options.mappingRepository) {
      return { provide: MAPPING_REPOSITORY, useValue: options.mappingRepository };
    }
    if (options.mappingRepositoryFactory) {
      return {
        provide: MAPPING_REPOSITORY,
        useFactory: options.mappingRepositoryFactory.useFactory,
        inject: options.mappingRepositoryFactory.inject || [],
      };
    }
    throw new Error(MESSAGES.ERROR.REPOSITORY_REQUIRED);
  }

  private static assembleModule(providers: Provider[]): DynamicModule {
    return {
      module: ConnectorModule,
      imports: [HttpModule],
      controllers: [ConnectorController],
      providers,
      exports: [ConnectorEngine, TransformerService, MappingRegistryService],
    };
  }
}
