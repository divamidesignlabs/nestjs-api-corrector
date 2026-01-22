import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { CorrectorEngine } from './services/corrector-engine.service';
import { TransformerService } from './services/transformer.service';
import { TargetApiCaller } from './services/target-api-caller.service';
import { AuthStrategyFactory } from './strategies/auth.strategy';
import { IntegrationMapping } from './entities/integration-mapping.entity';
import { MappingRegistryService } from './services/mapping-registry.service';
import { CorrectorController } from './corrector.controller';
import { CorrectorModuleOptions } from './interfaces/corrector-module-options.interface';

@Global()
@Module({})
export class CorrectorModule {
  static forRoot(options: CorrectorModuleOptions = {}): DynamicModule {
    const entity = options.entity || IntegrationMapping;

    const providers: Provider[] = [
      CorrectorEngine,
      TransformerService,
      TargetApiCaller,
      AuthStrategyFactory,
      MappingRegistryService,
      {
        provide: 'CORRECTOR_OPTIONS',
        useValue: options,
      },
      {
        provide: 'MAPPING_REPOSITORY',
        useExisting: getRepositoryToken(entity),
      },
    ];

    return {
      module: CorrectorModule,
      imports: [HttpModule, TypeOrmModule.forFeature([entity])],
      controllers: [CorrectorController],
      providers,
      exports: [
        CorrectorEngine,
        TransformerService,
        MappingRegistryService,
        'MAPPING_REPOSITORY',
      ],
    };
  }
}
