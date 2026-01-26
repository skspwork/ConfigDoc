import { describe, test, expect } from 'vitest';
import {
  normalizeToTemplatePath,
  hasArrayIndex,
  matchesTemplatePath,
  normalizeAssociativeArrayPath,
  getTemplatePathForConcrete,
  getValueByPath,
  findTemplateForPath,
  findAndMergeDocumentation,
  convertToWildcardBasePath
} from '@/lib/templatePath';
import { AssociativeArrayMapping } from '@/types';

describe('templatePath', () => {
  describe('normalizeToTemplatePath', () => {
    test('配列インデックスをワイルドカードに変換する', () => {
      expect(normalizeToTemplatePath('SystemUsers[0]:Id')).toBe('SystemUsers[*]:Id');
      expect(normalizeToTemplatePath('SystemUsers[1]:Name')).toBe('SystemUsers[*]:Name');
      expect(normalizeToTemplatePath('SystemUsers[10]:Email')).toBe('SystemUsers[*]:Email');
    });

    test('複数の配列インデックスを変換する', () => {
      expect(normalizeToTemplatePath('Items[0]:Sub[1]:Value')).toBe('Items[*]:Sub[*]:Value');
    });

    test('配列インデックスがないパスはそのまま返す', () => {
      expect(normalizeToTemplatePath('Database:ConnectionString')).toBe('Database:ConnectionString');
    });
  });

  describe('hasArrayIndex', () => {
    test('配列インデックスを含むパスをtrueと判定する', () => {
      expect(hasArrayIndex('Users[0]:Name')).toBe(true);
      expect(hasArrayIndex('Items[123]:Value')).toBe(true);
    });

    test('配列インデックスを含まないパスをfalseと判定する', () => {
      expect(hasArrayIndex('Database:Host')).toBe(false);
      expect(hasArrayIndex('Config:Value')).toBe(false);
    });
  });

  describe('matchesTemplatePath', () => {
    test('具体的なパスがテンプレートパスにマッチする', () => {
      expect(matchesTemplatePath('Users[0]:Name', 'Users[*]:Name')).toBe(true);
      expect(matchesTemplatePath('Users[5]:Name', 'Users[*]:Name')).toBe(true);
      expect(matchesTemplatePath('Items[0]:Sub[1]:Value', 'Items[*]:Sub[*]:Value')).toBe(true);
    });

    test('マッチしないパスはfalseを返す', () => {
      expect(matchesTemplatePath('Users[0]:Name', 'Users[*]:Email')).toBe(false);
      expect(matchesTemplatePath('Other[0]:Name', 'Users[*]:Name')).toBe(false);
    });
  });

  describe('getValueByPath', () => {
    test('ネストしたオブジェクトから値を取得する', () => {
      const obj = {
        Database: {
          Host: 'localhost',
          Port: 5432
        }
      };
      expect(getValueByPath(obj, 'Database:Host')).toBe('localhost');
      expect(getValueByPath(obj, 'Database:Port')).toBe(5432);
    });

    test('配列から値を取得する', () => {
      const obj = {
        Users: [
          { Name: 'Alice' },
          { Name: 'Bob' }
        ]
      };
      expect(getValueByPath(obj, 'Users[0]:Name')).toBe('Alice');
      expect(getValueByPath(obj, 'Users[1]:Name')).toBe('Bob');
    });

    test('存在しないパスはundefinedを返す', () => {
      const obj = { a: 1 };
      expect(getValueByPath(obj, 'b')).toBeUndefined();
      expect(getValueByPath(obj, 'a:b')).toBeUndefined();
    });
  });

  describe('normalizeAssociativeArrayPath - 単一レベル', () => {
    const configData = {
      Fields: {
        Field1: { Value: 'A' },
        Field2: { Value: 'B' }
      }
    };

    const mappings: AssociativeArrayMapping[] = [
      { basePath: 'Fields', createdAt: '' }
    ];

    test('連想配列のキー名をインデックスに変換する', () => {
      expect(normalizeAssociativeArrayPath('Fields:Field1:Value', mappings, configData))
        .toBe('Fields[0]:Value');
      expect(normalizeAssociativeArrayPath('Fields:Field2:Value', mappings, configData))
        .toBe('Fields[1]:Value');
    });

    test('連想配列でないパスはそのまま返す', () => {
      expect(normalizeAssociativeArrayPath('Other:Path', mappings, configData))
        .toBe('Other:Path');
    });
  });

  describe('normalizeAssociativeArrayPath - 再帰的（ネストした連想配列）', () => {
    const configData = {
      AppSettings: {
        Fields: {
          Field1: {
            Contents: {
              Map: {
                AAA: 1,
                BBB: 2
              }
            }
          },
          Field2: {
            Contents: {
              Map: {
                CCC: 3,
                DDD: 4
              }
            }
          }
        }
      }
    };

    const mappings: AssociativeArrayMapping[] = [
      { basePath: 'AppSettings:Fields', createdAt: '' },
      { basePath: 'AppSettings:Fields:Field1:Contents:Map', createdAt: '' },
      { basePath: 'AppSettings:Fields:Field2:Contents:Map', createdAt: '' }
    ];

    test('単一の連想配列を変換する', () => {
      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field1:Contents:Content1',
        mappings,
        configData
      )).toBe('AppSettings:Fields[0]:Contents:Content1');
    });

    test('ネストした連想配列を再帰的に変換する', () => {
      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field1:Contents:Map:AAA',
        mappings,
        configData
      )).toBe('AppSettings:Fields[0]:Contents:Map[0]');

      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field1:Contents:Map:BBB',
        mappings,
        configData
      )).toBe('AppSettings:Fields[0]:Contents:Map[1]');

      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field2:Contents:Map:CCC',
        mappings,
        configData
      )).toBe('AppSettings:Fields[1]:Contents:Map[0]');
    });
  });

  describe('getTemplatePathForConcrete', () => {
    const configData = {
      Fields: {
        Field1: { Value: 'A' },
        Field2: { Value: 'B' }
      }
    };

    const mappings: AssociativeArrayMapping[] = [
      { basePath: 'Fields', createdAt: '' }
    ];

    test('連想配列のパスをテンプレートパスに変換する', () => {
      expect(getTemplatePathForConcrete('Fields:Field1:Value', mappings, configData))
        .toBe('Fields[*]:Value');
    });

    test('通常の配列パスもテンプレートパスに変換する', () => {
      expect(getTemplatePathForConcrete('Users[0]:Name', [], undefined))
        .toBe('Users[*]:Name');
    });
  });

  describe('findTemplateForPath', () => {
    const docsProperties = {
      'Users[*]:Name': {
        path: 'Users[*]:Name',
        isTemplate: true,
        fields: { description: 'ユーザー名' }
      },
      'Users[0]:Email': {
        path: 'Users[0]:Email',
        isTemplate: false,
        fields: { description: '直接ドキュメント' }
      }
    };

    test('テンプレートドキュメントを見つける', () => {
      const result = findTemplateForPath('Users[1]:Name', docsProperties, [], undefined);
      expect(result).toBeDefined();
      expect(result?.isTemplate).toBe(true);
    });

    test('直接ドキュメントはテンプレートとして返さない', () => {
      const result = findTemplateForPath('Users[0]:Email', docsProperties, [], undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('findAndMergeDocumentation', () => {
    const docsProperties = {
      'Users[*]:Name': {
        path: 'Users[*]:Name',
        isTemplate: true,
        tags: ['required'],
        fields: { description: 'テンプレートの説明', note: 'テンプレートの備考' }
      },
      'Users[0]:Name': {
        path: 'Users[0]:Name',
        isTemplate: false,
        tags: [],
        fields: { description: '', note: '直接の備考' }
      }
    };

    test('直接ドキュメントの空フィールドをテンプレートで補完する', () => {
      const result = findAndMergeDocumentation('Users[0]:Name', docsProperties, [], undefined);
      expect(result).toBeDefined();
      expect(result?.fields?.description).toBe('テンプレートの説明');
      expect(result?.fields?.note).toBe('直接の備考'); // 直接ドキュメントの値を優先
    });

    test('タグがない場合はテンプレートのタグを使用する', () => {
      const result = findAndMergeDocumentation('Users[0]:Name', docsProperties, [], undefined);
      expect(result?.tags).toEqual(['required']);
    });

    test('テンプレートのみの場合はテンプレートを返す', () => {
      const result = findAndMergeDocumentation('Users[1]:Name', docsProperties, [], undefined);
      expect(result?.isTemplate).toBe(true);
      expect(result?.fields?.description).toBe('テンプレートの説明');
    });
  });

  describe('convertToWildcardBasePath', () => {
    const configData = {
      AppSettings: {
        Fields: {
          Field1: {
            Contents: {
              Map: {
                AAA: 1,
                BBB: 2
              }
            }
          },
          Field2: {
            Contents: {
              Map: {
                CCC: 3,
                DDD: 4
              }
            }
          }
        }
      }
    };

    test('親の連想配列がない場合はそのまま返す', () => {
      const mappings: AssociativeArrayMapping[] = [];
      expect(convertToWildcardBasePath('AppSettings:Fields', mappings, configData))
        .toBe('AppSettings:Fields');
    });

    test('親の連想配列キーをワイルドカードに変換する', () => {
      const mappings: AssociativeArrayMapping[] = [
        { basePath: 'AppSettings:Fields', createdAt: '' }
      ];
      expect(convertToWildcardBasePath(
        'AppSettings:Fields:Field1:Contents:Map',
        mappings,
        configData
      )).toBe('AppSettings:Fields[*]:Contents:Map');
    });

    test('複数階層の連想配列でも正しく変換する', () => {
      const mappings: AssociativeArrayMapping[] = [
        { basePath: 'AppSettings:Fields', createdAt: '' },
        { basePath: 'AppSettings:Fields[*]:Contents:Map', createdAt: '' }
      ];
      expect(convertToWildcardBasePath(
        'AppSettings:Fields:Field2:Contents:Map:CCC:SubKey',
        mappings,
        configData
      )).toBe('AppSettings:Fields[*]:Contents:Map[*]:SubKey');
    });
  });

  describe('normalizeAssociativeArrayPath - 連想配列の値が配列の場合', () => {
    const configData = {
      Fields: {
        Field1: [{ Name: 'a' }, { Name: 'b' }],
        Field2: [{ Name: 'c' }, { Name: 'd' }]
      }
    };

    const mappings: AssociativeArrayMapping[] = [
      { basePath: 'Fields', createdAt: '' }
    ];

    test('連想配列の値が配列の場合、キー名と配列インデックスを分離して変換する', () => {
      // Fields:Field1[0]:Name → Fields[0][0]:Name
      expect(normalizeAssociativeArrayPath(
        'Fields:Field1[0]:Name',
        mappings,
        configData
      )).toBe('Fields[0][0]:Name');

      // Fields:Field1[1]:Name → Fields[0][1]:Name
      expect(normalizeAssociativeArrayPath(
        'Fields:Field1[1]:Name',
        mappings,
        configData
      )).toBe('Fields[0][1]:Name');

      // Fields:Field2[0]:Name → Fields[1][0]:Name
      expect(normalizeAssociativeArrayPath(
        'Fields:Field2[0]:Name',
        mappings,
        configData
      )).toBe('Fields[1][0]:Name');

      // Fields:Field2[1]:Name → Fields[1][1]:Name
      expect(normalizeAssociativeArrayPath(
        'Fields:Field2[1]:Name',
        mappings,
        configData
      )).toBe('Fields[1][1]:Name');
    });

    test('配列インデックスのない通常のパスも正常に変換する', () => {
      // 連想配列の値が配列でも、インデックスなしのパスは従来通り
      expect(normalizeAssociativeArrayPath(
        'Fields:Field1',
        mappings,
        configData
      )).toBe('Fields[0]');
    });
  });

  describe('getTemplatePathForConcrete - 連想配列の値が配列の場合', () => {
    const configData = {
      Fields: {
        Field1: [{ Name: 'a' }],
        Field2: [{ Name: 'c' }]
      }
    };

    const mappings: AssociativeArrayMapping[] = [
      { basePath: 'Fields', createdAt: '' }
    ];

    test('連想配列+配列のパスをテンプレートパスに変換する', () => {
      // Fields:Field1[0]:Name → Fields[*][*]:Name
      expect(getTemplatePathForConcrete(
        'Fields:Field1[0]:Name',
        mappings,
        configData
      )).toBe('Fields[*][*]:Name');

      // Fields:Field2[0]:Name → Fields[*][*]:Name
      expect(getTemplatePathForConcrete(
        'Fields:Field2[0]:Name',
        mappings,
        configData
      )).toBe('Fields[*][*]:Name');
    });
  });

  describe('normalizeAssociativeArrayPath - ワイルドカード付きマッピング', () => {
    const configData = {
      AppSettings: {
        Fields: {
          Field1: {
            Contents: {
              Map: {
                AAA: 1,
                BBB: 2
              }
            }
          },
          Field2: {
            Contents: {
              Map: {
                CCC: 3,
                DDD: 4
              }
            }
          }
        }
      }
    };

    test('ワイルドカード付きマッピングで連想配列を正規化する', () => {
      const mappings: AssociativeArrayMapping[] = [
        { basePath: 'AppSettings:Fields', createdAt: '' },
        { basePath: 'AppSettings:Fields[*]:Contents:Map', createdAt: '' }
      ];

      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field1:Contents:Map:AAA',
        mappings,
        configData
      )).toBe('AppSettings:Fields[0]:Contents:Map[0]');

      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field1:Contents:Map:BBB',
        mappings,
        configData
      )).toBe('AppSettings:Fields[0]:Contents:Map[1]');

      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field2:Contents:Map:CCC',
        mappings,
        configData
      )).toBe('AppSettings:Fields[1]:Contents:Map[0]');

      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field2:Contents:Map:DDD',
        mappings,
        configData
      )).toBe('AppSettings:Fields[1]:Contents:Map[1]');
    });

    test('ワイルドカード付きマッピングのみでも動作する', () => {
      // AppSettings:Fieldsは連想配列マッピングとして登録されていないが、
      // AppSettings:Fields[*]:Contents:Mapはワイルドカード付きで登録されている場合
      const mappings: AssociativeArrayMapping[] = [
        { basePath: 'AppSettings:Fields', createdAt: '' },
        { basePath: 'AppSettings:Fields[*]:Contents:Map', createdAt: '' }
      ];

      // Field1のMapのAAAを正規化
      expect(normalizeAssociativeArrayPath(
        'AppSettings:Fields:Field1:Contents:Map:AAA',
        mappings,
        configData
      )).toBe('AppSettings:Fields[0]:Contents:Map[0]');
    });
  });
});
