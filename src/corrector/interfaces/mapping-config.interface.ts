export interface MappingItem {
  source: string;
  target: string;
  transform?: string; // e.g., 'roundTo2', 'uppercase'
  condition?: string; // JSONPath request-based condition e.g. "$.order.type == 'EXPRESS'"
  valueIfTrue?: any;
  valueIfFalse?: any;
  default?: any;
  required?: boolean; // If true, throws error if source path missing
}

export interface TransformDefinition {
  type: 'FUNCTION';
  logic: string;
}

export interface RequestMapping {
  type?: 'STATIC' | 'OBJECT'; // Default OBJECT
  description?: string;
  mappings?: MappingItem[];
  defaults?: Record<string, any>;
}

export interface ResponseMapping {
  type?: 'OBJECT' | 'ARRAY' | 'CUSTOM'; // Default OBJECT
  root?: string; // e.g. "$[*]" for arrays
  outputWrapper?: string; // e.g. "$.countries"
  mappings?: MappingItem[];
  defaults?: Record<string, any>;
  logic?: string; // For CUSTOM type (Javascript code body)
}

export interface AuthConfig {
  type:
    | 'basic'
    | 'api-key'
    | 'oauth2'
    | 'bearer'
    | 'passthrough'
    | 'none'
    | 'NONE'; // Added bearer and passthrough
  [key: string]: any;
}

export interface TargetApiConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  timeoutMs?: number;
}

export interface ErrorAction {
  action?: 'SKIP_RECORD' | 'THROW';
  mapTo?: Record<string, string>;
}

export interface ErrorHandlingConfig {
  onHttpError?: ErrorAction;
  onTransformError?: ErrorAction;
}

export interface MappingConfig {
  id: string; // Integration ID
  integrationId?: string; // Alias or secondary ID
  version?: string;
  status?: string;

  sourceSystem: string;
  targetSystem: string;

  requestMapping?: RequestMapping;
  authConfig?: AuthConfig;
  targetApi: TargetApiConfig;
  responseMapping?: ResponseMapping;

  transforms?: Record<string, TransformDefinition>;
  errorHandling?: ErrorHandlingConfig;

  metadata?: Record<string, any>;

  // Backwards compatibility or alternative error format
  errorMapping?: any;
}
