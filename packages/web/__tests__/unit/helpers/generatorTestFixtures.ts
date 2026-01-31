import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * ジェネレーターテスト用の共通フィクスチャ（分離強化版）
 */
export class GeneratorTestFixtures {
  public readonly testRootPath: string;
  private readonly configDocDir: string;
  private readonly metadataDir: string;

  constructor(testName: string) {
    // 一意のディレクトリ名を生成（タイムスタンプ + ランダム）
    const uniqueId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const dirName = `config-doc-test-${testName}-${uniqueId}`;

    // OSの一時ディレクトリを使用
    this.testRootPath = path.join(os.tmpdir(), dirName);
    this.configDocDir = path.join(this.testRootPath, '.config_doc');
    this.metadataDir = path.join(this.configDocDir, 'metadata', 'docs');
  }

  /**
   * テスト用のディレクトリとファイルを作成
   */
  setup(): void {
    try {
      // ディレクトリが既に存在する場合は削除
      if (fs.existsSync(this.testRootPath)) {
        fs.rmSync(this.testRootPath, { recursive: true, force: true });
      }

      // テスト用ディレクトリを作成
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
      AllowedHosts: ['localhost', '*.example.com', 'api.test.com'],
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
        'AllowedHosts': {
          path: 'AllowedHosts',
          modifiedAt: '2026-01-22T00:00:00.000Z',
          fields: {
            '説明': '許可するホスト名のリスト'
          },
          tags: ['注意']
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
    } catch (error) {
      // セットアップ失敗時は確実にクリーンアップ
      this.cleanup();
      throw error;
    }
  }

  /**
   * テストディレクトリをクリーンアップ
   * エラーが発生しても継続（べき等性を保証）
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.testRootPath)) {
        fs.rmSync(this.testRootPath, { recursive: true, force: true });
      }
    } catch (error) {
      // クリーンアップエラーは警告のみ（テスト失敗にしない）
      console.warn(`Failed to cleanup test directory ${this.testRootPath}:`, error);
    }
  }
}
