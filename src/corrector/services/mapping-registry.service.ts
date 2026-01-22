import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IntegrationMapping } from '../entities/integration-mapping.entity';
import { MappingConfig } from '../interfaces/mapping-config.interface';

@Injectable()
export class MappingRegistryService {
  constructor(
    @Inject('MAPPING_REPOSITORY')
    private readonly mappingRepo: Repository<IntegrationMapping>,
  ) {}

  async create(
    name: string,
    config: MappingConfig,
    version = '1.0.0',
  ): Promise<IntegrationMapping> {
    const mapping = this.mappingRepo.create({
      name,
      sourceSystem: config.sourceSystem,
      targetSystem: config.targetSystem,
      mappingConfig: config,
      version,
    });
    return this.mappingRepo.save(mapping);
  }

  async findOne(id: string): Promise<IntegrationMapping> {
    const mapping = await this.mappingRepo.findOne({ where: { id } });
    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }
    return mapping;
  }

  async findByIdOrName(idOrName: string): Promise<IntegrationMapping> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrName,
      );

    let mapping: IntegrationMapping | null = null;

    if (isUuid) {
      mapping = await this.mappingRepo.findOne({ where: { id: idOrName } });
    }

    if (!mapping) {
      mapping = await this.mappingRepo.findOne({ where: { name: idOrName } });
    }

    if (!mapping) {
      throw new NotFoundException(
        `Mapping with ID or Name '${idOrName}' not found`,
      );
    }
    return mapping;
  }

  async findActive(
    sourceSystem: string,
    targetSystem: string,
  ): Promise<IntegrationMapping> {
    const mapping = await this.mappingRepo.findOne({
      where: {
        sourceSystem,
        targetSystem,
        isActive: true,
      },
      order: { version: 'DESC' }, // Simple version strategy: latest active
    });

    if (!mapping) {
      throw new NotFoundException(
        `No active mapping found for ${sourceSystem} -> ${targetSystem}`,
      );
    }
    return mapping;
  }

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<IntegrationMapping> {
    const mapping = await this.findOne(id);
    mapping.isActive = isActive;
    return this.mappingRepo.save(mapping);
  }
}
