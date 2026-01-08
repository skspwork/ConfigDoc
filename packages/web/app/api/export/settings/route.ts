import { NextRequest, NextResponse } from 'next/server';
import { getRootPath } from '@/lib/getRootPath';
import path from 'path';
import fs from 'fs/promises';
import { ExportSettings } from '@/types';

const SETTINGS_FILE = 'settings.local.json';
const CONFIG_DOC_DIR = '.config_doc';

// GET: エクスポート設定を読み込み
export async function GET() {
  try {
    const rootPath = getRootPath();
    const settingsPath = path.join(rootPath, CONFIG_DOC_DIR, SETTINGS_FILE);

    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings: ExportSettings = JSON.parse(content);

      return NextResponse.json({
        success: true,
        data: settings
      });
    } catch (error) {
      // ファイルが存在しない場合はデフォルト設定を返す
      const defaultSettings: ExportSettings = {
        outputPath: '.config_doc/index.html',
        format: 'html',
        autoExport: true
      };

      return NextResponse.json({
        success: true,
        data: defaultSettings
      });
    }
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

    if (!settings || !settings.outputPath || !settings.format) {
      return NextResponse.json(
        { success: false, error: 'Invalid settings' },
        { status: 400 }
      );
    }

    const rootPath = getRootPath();
    const configDocDir = path.join(rootPath, CONFIG_DOC_DIR);
    const settingsPath = path.join(configDocDir, SETTINGS_FILE);

    // .config_docディレクトリを確保
    await fs.mkdir(configDocDir, { recursive: true });

    // 設定ファイルに保存
    await fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 2),
      'utf-8'
    );

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
