import { ConfigTreeNode } from '@/types';

export class ConfigParser {
  static flattenConfig(
    obj: any,
    prefix: string = ''
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
      const fullPath = prefix ? `${prefix}:${key}` : key;
      const value = obj[key];

      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // 配列の場合：オブジェクト要素があれば展開
          const hasObjectElements = value.some(
            item => item && typeof item === 'object' && !Array.isArray(item)
          );
          if (hasObjectElements) {
            value.forEach((item, index) => {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                Object.assign(result, this.flattenConfig(item, `${fullPath}[${index}]`));
              }
            });
          } else {
            // プリミティブ配列はそのまま
            result[fullPath] = value;
          }
        } else {
          // オブジェクトの場合（既存ロジック）
          Object.assign(result, this.flattenConfig(value, fullPath));
        }
      } else {
        result[fullPath] = value;
      }
    }

    return result;
  }

  static buildTree(obj: any, prefix: string = ''): ConfigTreeNode[] {
    const nodes: ConfigTreeNode[] = [];

    for (const key in obj) {
      const fullPath = prefix ? `${prefix}:${key}` : key;
      const value = obj[key];

      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // 配列の場合：オブジェクト要素があれば展開
          const hasObjectElements = value.some(
            item => item && typeof item === 'object' && !Array.isArray(item)
          );
          if (hasObjectElements) {
            const children: ConfigTreeNode[] = [];
            value.forEach((item, index) => {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                children.push({
                  key: `[${index}]`,
                  fullPath: `${fullPath}[${index}]`,
                  value: item,
                  children: this.buildTree(item, `${fullPath}[${index}]`),
                  hasDocumentation: false,
                  type: 'object'
                });
              }
            });
            nodes.push({
              key,
              fullPath,
              value,
              children: children.length > 0 ? children : undefined,
              hasDocumentation: false,
              type: 'array'
            });
          } else {
            // プリミティブ配列は展開しない
            nodes.push({
              key,
              fullPath,
              value,
              hasDocumentation: false,
              type: 'array'
            });
          }
        } else {
          // オブジェクトの場合（既存ロジック）
          nodes.push({
            key,
            fullPath,
            value,
            children: this.buildTree(value, fullPath),
            hasDocumentation: false,
            type: 'object'
          });
        }
      } else {
        nodes.push({
          key,
          fullPath,
          value,
          hasDocumentation: false,
          type: typeof value as any
        });
      }
    }

    return nodes;
  }
}
