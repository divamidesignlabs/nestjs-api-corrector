import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MappingConfig } from '../interfaces/mapping-config.interface';

@Entity('integration_mappings_config')
export class IntegrationMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'source_system' })
  sourceSystem: string;

  @Column({ name: 'target_system' })
  targetSystem: string;

  @Column('jsonb', { name: 'mapping_config' })
  mappingConfig: MappingConfig;

  @Column({ default: '1.0.0' })
  version: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
