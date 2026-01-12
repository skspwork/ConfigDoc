import { NextRequest, NextResponse } from 'next/server';
import { getRootPath } from '@/lib/getRootPath';
import path from 'path';
import fs from 'fs/promises';
import { ExportSettings, UserSettings, ProjectSettings } from '@/types';
import { FileSystemService } from '@/lib/fileSystem';

const USER_SETTINGS_FILE = '.user_settings.json';
const CONFIG_DOC_DIR = '.config_doc';

// GET: エクスポート設定を読み込み
export async function GET() {
  try {
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const userSettingsPath = path.join(rootPath, CONFIG_DOC_DIR, USER_SETTINGS_FILE);

    // ユーザ設定を読み込み
    let userSettings: UserSettings;
    try {
      const content = await fs.readFile(userSettingsPath, 'utf-8');
      userSettings = JSON.parse(content);
    } catch {
      // デフォルトのユーザ設定
      userSettings = {
        format: 'html',
        autoExport: true
      };
    }

    // プロジェクト設定から export.fileName を取得
    const projectSettings = await fsService.loadProjectSettings();
    const fileName = projectSettings?.export?.fileName || 'config-doc';

    // 統合された設定を返す
    const settings: ExportSettings = {
      ...userSettings,
      fileName
    };

    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Failed to load export settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: エクスポート設定を保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings: ExportSettings = body.settings;

    if (!settings || !settings.format) {
      return NextResponse.json(
        { success: false, error: 'Invalid settings' },
        { status: 400 }
      );
    }

    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const configDocDir = path.join(rootPath, CONFIG_DOC_DIR);

    // .config_doc ディレクトリを確保
    await fs.mkdir(configDocDir, { recursive: true });

    // ユーザ設定を保存（format, autoExport, lastExportedAt）
    const userSettings: UserSettings = {
      format: settings.format,
      autoExport: settings.autoExport,
      lastExportedAt: settings.lastExportedAt
    };
    const userSettingsPath = path.join(configDocDir, USER_SETTINGS_FILE);
    await fs.writeFile(
      userSettingsPath,
      JSON.stringify(userSettings, null, 2),
      'utf-8'
    );

    // プロジェクト設定の export.fileName を更新
    if (settings.fileName !== undefined) {
      const existingProjectSettings = await fsService.loadProjectSettings();

      if (existingProjectSettings) {
        // 既存の設定を更新
        existingProjectSettings.export = {
          ...existingProjectSettings.export,
          fileName: settings.fileName
        };
        await fsService.saveProjectSettings(existingProjectSettings);
      } else {
        // 新規作成
        const newProjectSettings: ProjectSettings = {
          projectName: path.basename(rootPath),
          configFiles: [],
          export: {
            fileName: settings.fileName
          }
        };
        await fsService.saveProjectSettings(newProjectSettings);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Export settings saved'
    });
  } catch (error) {
    console.error('Failed to save export settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
