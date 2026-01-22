import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownGenerator } from '../../lib/markdownGenerator';
import { MarkdownTableGenerator } from '../../lib/markdownTableGenerator';
import { HtmlGenerator } from '../../lib/htmlGenerator';
import { FileSystemService } from '../../lib/fileSystem';
import * as fs from 'fs';
import * as path from 'path';

describe('Generator Snapshot Tests', () => {
  const testRootPath = path.join(process.cwd(), '__tests__', 'fixtures', 'generator-test');

  beforeEach(() => {
    // テスト用ディレクトリとファイルを作成
    if (!fs.existsSync(testRootPath)) {
      fs.mkdirSync(testRootPath, { recursive: true });
    }

    const configDocDir = path.join(testRootPath, '.config_doc');
    const metadataDir = path.join(configDocDir, 'metadata', 'docs');
    fs.mkdirSync(metadataDir, { recursive: true });

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
      path.join(testRootPath, 'appsettings.json'),
      JSON.stringify(testConfig, null, 2)
    );

    // プロジェクト設定
    const projectSettings = {
      projectName: 'Test Project',
      configFiles: ['appsettings.json'],
      export: { fileName: 'config-doc' }
    };

    fs.writeFileSync(
      path.join(configDocDir, 'project_settings.json'),
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
      path.join(metadataDir, 'appsettings.docs.json'),
      JSON.stringify(docs, null, 2)
    );
  });

  afterEach(() => {
    // テストディレクトリをクリーンアップ
    if (fs.existsSync(testRootPath)) {
      fs.rmSync(testRootPath, { recursive: true, force: true });
    }
  });

  test('MarkdownGenerator - スナップショット', async () => {
    const generator = new MarkdownGenerator(testRootPath);
    const output = await generator.generateMarkdown();

    // タイムスタンプ部分を固定値に置換
    const normalized = output.replace(/最終更新: .+\n/g, '最終更新: 2026/1/22 0:00:00\n');

    expect(normalized).toMatchSnapshot();
  });

  test('MarkdownTableGenerator - スナップショット', async () => {
    const generator = new MarkdownTableGenerator(testRootPath);
    const output = await generator.generateMarkdownTable();

    // タイムスタンプ部分を固定値に置換
    const normalized = output.replace(/最終更新: .+\n/g, '最終更新: 2026/1/22 0:00:00\n');

    expect(normalized).toMatchSnapshot();
  });

  test('HtmlGenerator - スナップショット', async () => {
    const generator = new HtmlGenerator(testRootPath);
    const output = await generator.generateHtml();

    // タイムスタンプ部分を固定値に置換
    const normalized = output.replace(/最終更新: .+<\/p>/g, '最終更新: 2026/1/22 0:00:00</p>');

    expect(normalized).toMatchSnapshot();
  });
});
