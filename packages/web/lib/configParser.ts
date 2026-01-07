import { ConfigTreeNode } from '@/types';

export class ConfigParser {
  static flattenConfig(
    obj: any,
    prefix: string = ''
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
      const fullPath = prefix ? `${prefix}:${key}` : key;

      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(result, this.flattenConfig(obj[key], fullPath));
      } else {
        result[fullPath] = obj[key];
      }
    }

    return result;
  }

  static buildTree(obj: any, prefix: string = ''): ConfigTreeNode[] {
    const nodes: ConfigTreeNode[] = [];

    for (const key in obj) {
      const fullPath = prefix ? `${prefix}:${key}` : key;
      const value = obj[key];

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        nodes.push({
          key,
          fullPath,
          value,
          children: this.buildTree(value, fullPath),
          hasDocumentation: false,
          type: 'object'
        });
      } else {
        nodes.push({
          key,
          fullPath,
          value,
          hasDocumentation: false,
          type: Array.isArray(value) ? 'array' : typeof value as any
        });
      }
    }

    return nodes;
  }
}
