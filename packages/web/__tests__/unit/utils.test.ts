import { describe, test, expect } from 'vitest';
import {
  escapeTableCell,
  escapeHtml,
  getPropertyByPath,
  formatValue,
} from '@/lib/utils';

describe('escapeTableCell', () => {
  test('パイプ文字をエスケープする', () => {
    expect(escapeTableCell('a|b')).toBe('a\\|b');
  });

  test('改行をbrタグに変換する', () => {
    expect(escapeTableCell('line1\nline2')).toBe('line1<br>line2');
  });

  test('キャリッジリターンを削除する', () => {
    expect(escapeTableCell('line1\r\nline2')).toBe('line1<br>line2');
  });

  test('複数の特殊文字を同時にエスケープする', () => {
    expect(escapeTableCell('a|b\nc|d')).toBe('a\\|b<br>c\\|d');
  });

  test('特殊文字がない場合はそのまま返す', () => {
    expect(escapeTableCell('normal text')).toBe('normal text');
  });

  test('空文字列はそのまま返す', () => {
    expect(escapeTableCell('')).toBe('');
  });
});

describe('escapeHtml', () => {
  test('アンパサンドをエスケープする', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  test('小なり記号をエスケープする', () => {
    expect(escapeHtml('a<b')).toBe('a&lt;b');
  });

  test('大なり記号をエスケープする', () => {
    expect(escapeHtml('a>b')).toBe('a&gt;b');
  });

  test('ダブルクォートをエスケープする', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b');
  });

  test('シングルクォートをエスケープする', () => {
    expect(escapeHtml("a'b")).toBe('a&#039;b');
  });

  test('HTMLタグを無害化する', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('空文字列はそのまま返す', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('getPropertyByPath', () => {
  const testObj = {
    Database: {
      ConnectionString: 'Server=localhost',
      Settings: {
        Timeout: 30,
        RetryCount: 3,
      },
    },
    Logging: {
      Level: 'Information',
    },
    Simple: 'value',
  };

  test('トップレベルのプロパティを取得できる', () => {
    expect(getPropertyByPath(testObj, 'Simple')).toBe('value');
  });

  test('ネストしたプロパティを取得できる', () => {
    expect(getPropertyByPath(testObj, 'Database:ConnectionString')).toBe('Server=localhost');
  });

  test('深くネストしたプロパティを取得できる', () => {
    expect(getPropertyByPath(testObj, 'Database:Settings:Timeout')).toBe(30);
  });

  test('オブジェクトを取得できる', () => {
    expect(getPropertyByPath(testObj, 'Database:Settings')).toEqual({
      Timeout: 30,
      RetryCount: 3,
    });
  });

  test('存在しないパスはundefinedを返す', () => {
    expect(getPropertyByPath(testObj, 'NonExistent')).toBeUndefined();
  });

  test('途中のパスが存在しない場合はundefinedを返す', () => {
    expect(getPropertyByPath(testObj, 'Database:NonExistent:Value')).toBeUndefined();
  });

  test('nullに対してはundefinedを返す', () => {
    expect(getPropertyByPath(null, 'path')).toBeUndefined();
  });

  test('undefinedに対してはundefinedを返す', () => {
    expect(getPropertyByPath(undefined, 'path')).toBeUndefined();
  });

  test('プリミティブ値に対してはundefinedを返す', () => {
    expect(getPropertyByPath('string', 'path')).toBeUndefined();
    expect(getPropertyByPath(123, 'path')).toBeUndefined();
  });

  describe('配列インデックスのサポート', () => {
    const arrayObj = {
      Servers: [
        { Name: 'Server1', Port: 8080 },
        { Name: 'Server2', Port: 8081 }
      ],
      Nested: {
        Items: [
          { Value: 'first' },
          { Value: 'second' }
        ]
      }
    };

    test('配列要素のプロパティを取得できる', () => {
      expect(getPropertyByPath(arrayObj, 'Servers[0]:Name')).toBe('Server1');
      expect(getPropertyByPath(arrayObj, 'Servers[1]:Port')).toBe(8081);
    });

    test('配列要素オブジェクトを取得できる', () => {
      expect(getPropertyByPath(arrayObj, 'Servers[0]')).toEqual({ Name: 'Server1', Port: 8080 });
    });

    test('ネストした構造内の配列要素を取得できる', () => {
      expect(getPropertyByPath(arrayObj, 'Nested:Items[0]:Value')).toBe('first');
      expect(getPropertyByPath(arrayObj, 'Nested:Items[1]:Value')).toBe('second');
    });

    test('存在しないインデックスはundefinedを返す', () => {
      expect(getPropertyByPath(arrayObj, 'Servers[10]:Name')).toBeUndefined();
    });

    test('配列でないものにインデックスを使うとundefinedを返す', () => {
      expect(getPropertyByPath(arrayObj, 'Nested[0]')).toBeUndefined();
    });

    test('深くネストした配列を処理できる', () => {
      const deepObj = {
        Level1: [{
          Level2: [{
            Value: 'deep'
          }]
        }]
      };
      expect(getPropertyByPath(deepObj, 'Level1[0]:Level2[0]:Value')).toBe('deep');
    });
  });
});

describe('formatValue', () => {
  test('文字列はそのまま返す', () => {
    expect(formatValue('hello')).toBe('hello');
  });

  test('数値は文字列に変換する', () => {
    expect(formatValue(123)).toBe('123');
    expect(formatValue(3.14)).toBe('3.14');
  });

  test('booleanは文字列に変換する', () => {
    expect(formatValue(true)).toBe('true');
    expect(formatValue(false)).toBe('false');
  });

  test('nullは"-"を返す', () => {
    expect(formatValue(null)).toBe('-');
  });

  test('undefinedは"-"を返す', () => {
    expect(formatValue(undefined)).toBe('-');
  });

  test('オブジェクトはJSON文字列に変換する', () => {
    expect(formatValue({ key: 'value' })).toBe('{"key":"value"}');
  });

  test('配列はJSON文字列に変換する', () => {
    expect(formatValue([1, 2, 3])).toBe('[1,2,3]');
  });

  test('空のオブジェクトはJSON文字列に変換する', () => {
    expect(formatValue({})).toBe('{}');
  });

  test('空の配列はJSON文字列に変換する', () => {
    expect(formatValue([])).toBe('[]');
  });

  test('0は"0"を返す（falsyだが有効な値）', () => {
    expect(formatValue(0)).toBe('0');
  });

  test('空文字列はそのまま返す', () => {
    expect(formatValue('')).toBe('');
  });
});
