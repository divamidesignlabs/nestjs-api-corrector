import { Injectable, Logger } from '@nestjs/common';
import * as jsonpath from 'jsonpath';
import {
  RequestMapping,
  ResponseMapping,
} from '../interfaces/mapping-config.interface';

@Injectable()
export class TransformerService {
  private readonly logger = new Logger(TransformerService.name);

  // Core transform entry
  transform(
    sourceData: any,
    mapping: any,
    customTransforms?: Record<string, any>,
  ): any {
    if (!mapping) {
      return sourceData;
    }

    // Handle Array Mapping
    if (mapping.type === 'ARRAY' && mapping.root) {
      return this.transformArray(sourceData, mapping, customTransforms);
    }

    // Handle Custom Script Mapping (Root Level)
    if (mapping.type === 'CUSTOM' && mapping.logic) {
      return this.executeCustomLogic(sourceData, mapping.logic);
    }

    // Default Object Mapping
    return this.transformObject(sourceData, mapping, customTransforms);
  }

  private transformArray(
    source: any,
    mapping: any,
    customTransforms?: Record<string, any>,
  ): any {
    const rootArray = this.getValue(source, mapping.root);

    if (!Array.isArray(rootArray)) {
      this.logger.warn(`Root path ${mapping.root} did not resolve to an array`);
      return [];
    }

    const transformedList = rootArray.map((item) => {
      // Create a temporary mapping config for the item, treating it as an object mapping
      const itemMapping = { ...mapping, type: 'OBJECT', root: undefined }; // Reset root for recursing
      // We pass 'item' as source. Note: JSONPath usually works on root,
      // but for array mapping, we often want relative paths.
      // Implementing relative path support by treating 'item' as the new root source.
      return this.transformObject(item, itemMapping, customTransforms);
    });

    if (mapping.outputWrapper) {
      const result = {};
      this.setValue(result, mapping.outputWrapper, transformedList);
      return result;
    }

    return transformedList;
  }

  private transformObject(
    source: any,
    mapping: any,
    customTransforms?: Record<string, any>,
  ): any {
    const result = {};

    if (mapping.mappings) {
      for (const mapItem of mapping.mappings) {
        try {
          let value: any;
          const conditionPassed =
            !mapItem.condition ||
            this.evaluateCondition(source, mapItem.condition);

          if (mapItem.condition) {
            if (conditionPassed) {
              value =
                mapItem.valueIfTrue !== undefined
                  ? mapItem.valueIfTrue
                  : jsonpath.value(source, mapItem.source);
            } else {
              if (mapItem.valueIfFalse !== undefined) {
                value = mapItem.valueIfFalse;
              } else {
                continue; // Skip if no false value provided
              }
            }
          } else {
            value = jsonpath.value(source, mapItem.source);
          }

          // Handle default if source path is missing
          if (value === undefined) {
            value = mapItem.default;
          }

          // STRICT VALIDATION: Check if field is required but missing
          if (mapItem.required && value === undefined) {
            throw new Error(`Missing required field: ${mapItem.source}`);
          }

          if (value !== undefined && mapItem.transform) {
            value = this.applyTransform(
              value,
              mapItem.transform,
              customTransforms,
            );
          }

          if (value !== undefined) {
            this.setValue(result, mapItem.target, value);
          }
        } catch (error) {
          this.logger.warn(
            `Mapping failed for ${mapItem.source}: ${error.message}`,
          );
        }
      }
    }

    // Apply object-level defaults (if target keys missing)
    if (mapping.defaults) {
      for (const [path, defaultValue] of Object.entries(mapping.defaults)) {
        if (this.getValue(result, path) === undefined) {
          this.setValue(result, path, defaultValue);
        }
      }
    }

    return result;
  }

  private evaluateCondition(data: any, condition: string): boolean {
    // Simple equality check support or boolean path check
    if (condition.includes('==')) {
      const [path, val] = condition
        .split('==')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      return String(this.getValue(data, path)) === val;
    }
    return !!this.getValue(data, condition);
  }

  private applyTransform(
    value: any,
    transformName: string,
    customTransforms?: Record<string, any>,
  ): any {
    // 1. Built-in transforms
    switch (transformName) {
      case 'roundTo2':
        return typeof value === 'number'
          ? Math.round(value * 100) / 100
          : value;
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'toNumber':
        return Number(value);
      case 'toString':
        return String(value);
    }

    // 2. Custom Configured Transforms
    if (customTransforms && customTransforms[transformName]) {
      return this.executeCustomLogic(
        value,
        customTransforms[transformName].logic,
      );
    }

    return value;
  }

  private executeCustomLogic(value: any, logicBody: string): any {
    try {
      // Safe(ish) functionality: new Function('value', body)
      // Ensure logicBody is just the inner logic.
      // Example: "return value + 1;"
      const fn = new Function('value', logicBody);
      return fn(value);
    } catch (e) {
      this.logger.error(`Custom transform error: ${e.message}`);
      return { error: `Script Error: ${e.message}` };
    }
  }

  private setValue(obj: any, path: string, value: any): void {
    const cleanPath = path.startsWith('$.') ? path.slice(2) : path;
    const parts = cleanPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  private getValue(obj: any, path: string): any {
    try {
      // If the path is relative (doesn't start with $), prepend it for jsonpath
      // But strict jsonpath usually requires $, so we ensure it starts with $.
      // However, for array iteration 'obj' is an item.
      // Standard jsonpath.value(item, "$.name") works fine if "$.name" refers to properties of item.
      // Note: jsonpath behavior on non-root objects might vary if path implies root.
      return jsonpath.value(obj, path);
    } catch (e) {
      return undefined;
    }
  }
}
