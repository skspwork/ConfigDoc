import { describe, test, expect } from 'vitest';
import { parseJSON, removeBOM } from '@/lib/jsonUtils';

describe('parseJSON', () => {
  describe('標準JSON', () => {
    test('シンプルなオブジェクトをパースできる', () => {
      const result = parseJSON<{ name: string }>('{"name": "test"}');
      expect(result).toEqual({ name: 'test' });
    });

    test('配列をパースできる', () => {
      const result = parseJSON<number[]>('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    test('ネストしたオブジェクトをパースできる', () => {
      const json = '{"database": {"host": "localhost", "port": 5432}}';
      const result = parseJSON<{ database: { host: string; port: number } }>(json);
      expect(result).toEqual({ database: { host: 'localhost', port: 5432 } });
    });
  });

  describe('JSONC形式', () => {
    test('単一行コメントを含むJSONをパースできる', () => {
      const jsonc = `{
        // これはコメント
        "name": "test"
      }`;
      const result = parseJSON<{ name: string }>(jsonc);
      expect(result).toEqual({ name: 'test' });
    });

    test('ブロックコメントを含むJSONをパースできる', () => {
      const jsonc = `{
        /* ブロックコメント */
        "value": 123
      }`;
      const result = parseJSON<{ value: number }>(jsonc);
      expect(result).toEqual({ value: 123 });
    });

    test('行末コメントを含むJSONをパースできる', () => {
      const jsonc = `{
        "key": "value" // 行末コメント
      }`;
      const result = parseJSON<{ key: string }>(jsonc);
      expect(result).toEqual({ key: 'value' });
    });

    test('末尾カンマを含むオブジェクトをパースできる', () => {
      const jsonc = `{
        "a": 1,
        "b": 2,
      }`;
      const result = parseJSON<{ a: number; b: number }>(jsonc);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('末尾カンマを含む配列をパースできる', () => {
      const jsonc = '[1, 2, 3,]';
      const result = parseJSON<number[]>(jsonc);
      expect(result).toEqual([1, 2, 3]);
    });

    test('文字列内の//はコメントとして扱わない', () => {
      const jsonc = '{"url": "https://example.com"}';
      const result = parseJSON<{ url: string }>(jsonc);
      expect(result).toEqual({ url: 'https://example.com' });
    });

    test('複合的なJSONC形式をパースできる', () => {
      const jsonc = `{
        // 設定ファイル
        "database": {
          /* 接続設定 */
          "host": "localhost", // ホスト名
          "port": 5432,
        },
      }`;
      const result = parseJSON<{ database: { host: string; port: number } }>(jsonc);
      expect(result).toEqual({ database: { host: 'localhost', port: 5432 } });
    });
  });

  describe('BOM除去', () => {
    test('BOM付きJSONをパースできる', () => {
      const bomJson = '\uFEFF{"name": "test"}';
      const result = parseJSON<{ name: string }>(bomJson);
      expect(result).toEqual({ name: 'test' });
    });

    test('BOMなしJSONも正常にパースできる', () => {
      const json = '{"name": "test"}';
      const result = parseJSON<{ name: string }>(json);
      expect(result).toEqual({ name: 'test' });
    });
  });

  describe('エラーハンドリング', () => {
    // jsonc-parserは寛容なパーサーで、不正なJSONでもベストエフォートで解析する
    test('不完全なJSONは部分的にパースされる', () => {
      // jsonc-parserは{invalid}を{}として解釈する
      const result = parseJSON('{invalid}');
      expect(result).toEqual({});
    });

    test('空文字列でundefinedを返す', () => {
      const result = parseJSON('');
      expect(result).toBeUndefined();
    });
  });
});

describe('removeBOM', () => {
  test('BOMを除去できる', () => {
    const withBom = '\uFEFFhello';
    const result = removeBOM(withBom);
    expect(result).toBe('hello');
  });

  test('BOMがない文字列はそのまま返す', () => {
    const noBom = 'hello';
    const result = removeBOM(noBom);
    expect(result).toBe('hello');
  });

  test('空文字列はそのまま返す', () => {
    const result = removeBOM('');
    expect(result).toBe('');
  });
});
