import { Injectable } from '@nestjs/common';
import * as jsonpath from 'jsonpath';
import {
  RequestMapping,
  ResponseMapping,
} from '../interfaces/mapping-config.interface';
import { MESSAGES } from '../constants';

@Injectable()
export class TransformerService {

  /**
   * Main entry point for data transformation.
   * Supports OBJECT, ARRAY, and DIRECT mapping types.
   */
  transform(
    sourceData: any,
    mapping: RequestMapping | ResponseMapping,
  ): any {
    if (!mapping || mapping.type === 'DIRECT') return sourceData;
 
    // Orchestrate based on mapping type
    switch (mapping.type) {
      case 'ARRAY':
        return this.transformArray(sourceData, mapping as ResponseMapping);
      case 'OBJECT':
      default:
        return this.transformObject(sourceData, mapping);
    }
  }

  private transformArray(
    source: any,
    mapping: ResponseMapping,
  ): any {
    if (!mapping.root) return [];
    
    const rootArray = this.getValue(source, mapping.root);
    if (!Array.isArray(rootArray)) {
      return [];
    }

    // Optimization: Define the item mapping once outside the loop
    const itemMapping: ResponseMapping = { ...mapping, type: 'OBJECT', root: undefined };

    const transformedList = rootArray.map((item: any) => 
      this.transformObject(item, itemMapping)
    );

    if (mapping.outputWrapper) {
      const result = {};
      this.setValue(result, mapping.outputWrapper, transformedList);
      return result;
    }

    return transformedList;
  }

  private transformObject(
    source: any,
    mapping: RequestMapping | ResponseMapping,
  ): any {
    const result = {};

    // 1. Process individual field mappings
    if (mapping.mappings) {
      for (const mapItem of mapping.mappings) {
        try {
          const value = this.resolveFieldValue(source, mapItem);

          // Handle required field validation
          if (mapItem.required && value === undefined) {
            throw new Error(MESSAGES.ERROR.REQUIRED_FIELD_MISSING(mapItem.source));
          }

          if (value === undefined) continue;

          // Apply transformations if defined
          const transformedValue = mapItem.transform 
            ? this.applyTransform(value, mapItem.transform)
            : value;

          if (transformedValue !== undefined) {
            this.setValue(result, mapItem.target, transformedValue);
          }
        } catch (error: any) {
          // Silent skip on field transform error
        }
      }
    }

    // 2. Apply object-level defaults for missing keys
    if (mapping.defaults) {
      for (const [path, defaultValue] of Object.entries(mapping.defaults)) {
        if (this.getValue(result, path) === undefined) {
          this.setValue(result, path, defaultValue);
        }
      }
    }

    return result;
  }

  private resolveFieldValue(source: any, mapItem: any): any {
    // A. Handle Conditional Logic
    if (mapItem.condition) {
      const conditionPassed = this.evaluateCondition(source, mapItem.condition);
      if (conditionPassed) {
        return mapItem.valueIfTrue !== undefined 
          ? mapItem.valueIfTrue 
          : this.getValue(source, mapItem.source);
      }
      return mapItem.valueIfFalse;
    }

    // B. Standard JSONPath Lookup
    const value = this.getValue(source, mapItem.source);
    return value !== undefined ? value : mapItem.default;
  }

  private evaluateCondition(data: any, condition: string): boolean {
    if (condition.includes('==')) {
      const [path, val] = condition.split('==').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      return String(this.getValue(data, path)) === val;
    }
    return !!this.getValue(data, condition);
  }

  private applyTransform(
    value: any,
    transformName: string,
  ): any {
    // 1. Core Built-in Utilities
    const builtInTransforms: Record<string, (v: any) => any> = {
      roundTo2: (v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v,
      uppercase: (v) => typeof v === 'string' ? v.toUpperCase() : v,
      lowercase: (v) => typeof v === 'string' ? v.toLowerCase() : v,
      toNumber: (v) => Number(v),
      toString: (v) => String(v),
    };

    if (builtInTransforms[transformName]) {
      return builtInTransforms[transformName](value);
    }

    return value;
  }



  /**
   * Deep set a value on an object using a dot-notation path.
   */
  private setValue(obj: any, path: string, value: any): void {
    const cleanPath = path.startsWith('$.') ? path.slice(2) : path;
    const parts = cleanPath.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart) current[lastPart] = value;
  }

  private getValue(obj: any, path: string): any {
    try {
      return jsonpath.value(obj, path);
    } catch {
      return undefined;
    }
  }
}
