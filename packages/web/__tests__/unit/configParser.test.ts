import { describe, test, expect } from 'vitest';
import { ConfigParser } from '@/lib/configParser';

describe('ConfigParser', () => {
  describe('flattenConfig', () => {
    test('フラットなオブジェクトをそのまま返す', () => {
      const obj = { name: 'test', value: 123 };
      const result = ConfigParser.flattenConfig(obj);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    test('ネストしたオブジェクトをフラット化する', () => {
      const obj = {
        Database: {
          Host: 'localhost',
          Port: 5432,
        },
      };
      const result = ConfigParser.flattenConfig(obj);
      expect(result).toEqual({
        'Database:Host': 'localhost',
        'Database:Port': 5432,
      });
    });

    test('深くネストしたオブジェクトをフラット化する', () => {
      const obj = {
        Level1: {
          Level2: {
            Level3: 'value',
          },
        },
      };
      const result = ConfigParser.flattenConfig(obj);
      expect(result).toEqual({
        'Level1:Level2:Level3': 'value',
      });
    });

    test('配列は値としてそのまま保持する', () => {
      const obj = {
        items: [1, 2, 3],
      };
      const result = ConfigParser.flattenConfig(obj);
      expect(result).toEqual({
        items: [1, 2, 3],
      });
    });

    test('nullやundefinedの値を保持する', () => {
      const obj = {
        nullValue: null,
        undefinedValue: undefined,
      };
      const result = ConfigParser.flattenConfig(obj);
      expect(result).toEqual({
        nullValue: null,
        undefinedValue: undefined,
      });
    });

    test('空のオブジェクトで空の結果を返す', () => {
      const result = ConfigParser.flattenConfig({});
      expect(result).toEqual({});
    });

    test('appsettings.json形式のオブジェクトをフラット化する', () => {
      const obj = {
        Logging: {
          LogLevel: {
            Default: 'Information',
            Microsoft: 'Warning',
          },
        },
        ConnectionStrings: {
          DefaultConnection: 'Server=localhost;Database=mydb',
        },
      };
      const result = ConfigParser.flattenConfig(obj);
      expect(result).toEqual({
        'Logging:LogLevel:Default': 'Information',
        'Logging:LogLevel:Microsoft': 'Warning',
        'ConnectionStrings:DefaultConnection': 'Server=localhost;Database=mydb',
      });
    });
  });

  describe('buildTree', () => {
    test('フラットなオブジェクトからツリーを構築する', () => {
      const obj = { name: 'test', value: 123 };
      const result = ConfigParser.buildTree(obj);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        key: 'name',
        fullPath: 'name',
        value: 'test',
        type: 'string',
      });
      expect(result[1]).toMatchObject({
        key: 'value',
        fullPath: 'value',
        value: 123,
        type: 'number',
      });
    });

    test('ネストしたオブジェクトからツリーを構築する', () => {
      const obj = {
        Database: {
          Host: 'localhost',
          Port: 5432,
        },
      };
      const result = ConfigParser.buildTree(obj);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        key: 'Database',
        fullPath: 'Database',
        type: 'object',
      });
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children![0]).toMatchObject({
        key: 'Host',
        fullPath: 'Database:Host',
        value: 'localhost',
        type: 'string',
      });
      expect(result[0].children![1]).toMatchObject({
        key: 'Port',
        fullPath: 'Database:Port',
        value: 5432,
        type: 'number',
      });
    });

    test('配列を含むオブジェクトからツリーを構築する', () => {
      const obj = {
        items: [1, 2, 3],
      };
      const result = ConfigParser.buildTree(obj);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        key: 'items',
        fullPath: 'items',
        value: [1, 2, 3],
        type: 'array',
      });
      expect(result[0].children).toBeUndefined();
    });

    test('boolean値を含むオブジェクトからツリーを構築する', () => {
      const obj = {
        enabled: true,
        disabled: false,
      };
      const result = ConfigParser.buildTree(obj);

      expect(result[0]).toMatchObject({
        key: 'enabled',
        value: true,
        type: 'boolean',
      });
      expect(result[1]).toMatchObject({
        key: 'disabled',
        value: false,
        type: 'boolean',
      });
    });

    test('深くネストしたオブジェクトからツリーを構築する', () => {
      const obj = {
        Level1: {
          Level2: {
            Level3: 'deepValue',
          },
        },
      };
      const result = ConfigParser.buildTree(obj);

      expect(result[0].fullPath).toBe('Level1');
      expect(result[0].children![0].fullPath).toBe('Level1:Level2');
      expect(result[0].children![0].children![0].fullPath).toBe('Level1:Level2:Level3');
      expect(result[0].children![0].children![0].value).toBe('deepValue');
    });

    test('hasDocumentationがfalseで初期化される', () => {
      const obj = { key: 'value' };
      const result = ConfigParser.buildTree(obj);

      expect(result[0].hasDocumentation).toBe(false);
    });

    test('空のオブジェクトで空の配列を返す', () => {
      const result = ConfigParser.buildTree({});
      expect(result).toEqual([]);
    });
  });
});
