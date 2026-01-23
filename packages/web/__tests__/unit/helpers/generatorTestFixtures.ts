import * as fs from 'fs';
import * as path from 'path';

/**
 * ジェネレーターテスト用の共通フィクスチャ
 */
export class GeneratorTestFixtures {
  public readonly testRootPath: string;
  private readonly configDocDir: string;
  private readonly metadataDir: string;

  constructor(testName: string) {
    this.testRootPath = path.join(process.cwd(), '__tests__', 'fixtures', testName);
    this.configDocDir = path.join(this.testRootPath, '.config_doc');
    this.metadataDir = path.join(this.configDocDir, 'metadata', 'docs');
  }

  /**
   * テスト用のディレクトリとファイルを作成
   */
  setup(): void {
    // テスト用ディレクトリを作成
    if (!fs.existsSync(this.testRootPath)) {
      fs.mkdirSync(this.testRootPath, { recursive: true });
    }

    fs.mkdirSync(this.metadataDir, { recursive: true });

    // テスト用の設定ファイル
    const testConfig = {
      Database: {
        Host: 'localhost',
        Port: 5432,
        ConnectionString: 'Server=localhost;Database=test'
      },
      Logging: {
        LogLevel: {
          Default: 'Information',
          Microsoft: 'Warning'
        }
      },
      Features: [
        { Name: 'Feature1', Enabled: true },
        { Name: 'Feature2', Enabled: false }
      ]
    };

    fs.writeFileSync(
      path.join(this.testRootPath, 'appsettings.json'),
      JSON.stringify(testConfig, null, 2)
    );

    // プロジェクト設定
    const projectSettings = {
      projectName: 'Test Project',
      configFiles: ['appsettings.json'],
      fields: { "説明": "", "例": "" },
      availableTags: ['重要', '注意'],
      export: { fileName: 'config-doc' },
    };

    fs.writeFileSync(
      path.join(this.configDocDir, 'project_settings.json'),
      JSON.stringify(projectSettings, null, 2)
    );

    // ドキュメントデータ
    const docs = {
      configFilePath: 'appsettings.json',
      lastModified: '2026-01-22T00:00:00.000Z',
      properties: {
        'Database': {
          path: 'Database',
          modifiedAt: '2026-01-22T00:00:00.000Z',
          fields: {
            '説明': 'データベース設定'
          }
        },
        'Database:Host': {
          path: 'Database:Host',
          modifiedAt: '2026-01-22T00:00:00.000Z',
          fields: {
            '説明': 'データベースホスト名'
          }
        },
        'Logging:LogLevel:Default': {
          path: 'Logging:LogLevel:Default',
          modifiedAt: '2026-01-22T00:00:00.000Z',
          fields: {
            '説明': 'デフォルトログレベル',
            '備考': 'Information推奨'
          },
          tags: ['重要']
        },
        'Features[0]': {
          path: 'Features[0]',
          modifiedAt: '2026-01-22T00:00:00.000Z',
          fields: {
            '説明': '最初の機能'
          }
        },
        'Features[0]:Name': {
          path: 'Features[0]:Name',
          modifiedAt: '2026-01-22T00:00:00.000Z',
          fields: {
            '説明': '機能名'
          }
        }
      }
    };

    fs.writeFileSync(
      path.join(this.metadataDir, 'appsettings.docs.json'),
      JSON.stringify(docs, null, 2)
    );
  }

  /**
   * テストディレクトリをクリーンアップ
   */
  cleanup(): void {
    if (fs.existsSync(this.testRootPath)) {
      fs.rmSync(this.testRootPath, { recursive: true, force: true });
    }
  }
}
