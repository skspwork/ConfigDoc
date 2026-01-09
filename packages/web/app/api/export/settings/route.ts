import { NextRequest, NextResponse } from 'next/server';
import { getRootPath } from '@/lib/getRootPath';
import path from 'path';
import fs from 'fs/promises';
import { ExportSettings, UserSettings, ProjectSettings } from '@/types';

const USER_SETTINGS_FILE = '.user.local.json';
const PROJECT_SETTINGS_FILE = 'settings.json';
const CONFIG_DOC_DIR = '.config_doc';

// GET: エクスポート設定を読み込み
export async function GET() {
  try {
    const rootPath = getRootPath();
    const userSettingsPath = path.join(rootPath, CONFIG_DOC_DIR, USER_SETTINGS_FILE);
    const projectSettingsPath = path.join(rootPath, CONFIG_DOC_DIR, PROJECT_SETTINGS_FILE);

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

    // プロジェクト設定を読み込み
    let projectSettings: ProjectSettings;
    try {
      const content = await fs.readFile(projectSettingsPath, 'utf-8');
      projectSettings = JSON.parse(content);
    } catch {
      // デフォルトのプロジェクト設定
      projectSettings = {
        fileName: 'config-doc'
      };
    }

    // 統合された設定を返す
    const settings: ExportSettings = {
      ...userSettings,
      ...projectSettings
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

    // プロジェクト設定を保存（fileName）
    if (settings.fileName !== undefined) {
      const projectSettings: ProjectSettings = {
        fileName: settings.fileName
      };
      const projectSettingsPath = path.join(configDocDir, PROJECT_SETTINGS_FILE);
      await fs.writeFile(
        projectSettingsPath,
        JSON.stringify(projectSettings, null, 2),
        'utf-8'
      );
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
