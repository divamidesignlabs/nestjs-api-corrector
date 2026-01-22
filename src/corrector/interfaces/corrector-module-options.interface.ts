import { MappingConfig } from './mapping-config.interface';

export interface CorrectorModuleOptions {
  /**
   * Optional custom entity class. Must extend at least the fields required by MappingRegistry.
   * If not provided, the default IntegrationMapping entity will be used.
   */
  entity?: any;

  /**
   * Other configuration options can go here (e.g. global timeout, retry settings)
   */
  globalTimeoutMs?: number;
}
