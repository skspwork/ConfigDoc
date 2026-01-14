import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { FileSystemService } from '@/lib/fileSystem';
import { StorageService } from '@/lib/storage';
import { ProjectConfigFiles } from '@/types';
import { getRootPath } from '@/lib/getRootPath';

export async function GET() {
  try {
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const storageService = new StorageService(fsService);

    // project_settings.jsonを読み込み
    const settings = await fsService.loadProjectSettings();

    if (!settings) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    // UI用にConfigFileInfo形式に変換（互換性のため）
    const configFiles = settings.configFiles.map((filePath, index) => ({
      id: `config-${index + 1}`,
      fileName: filePath.split(/[/\\]/).pop() || 'config.json',
      filePath,
      docsFileName: storageService.getDocsFileName(filePath)
    }));

    const metadata: ProjectConfigFiles = {
      projectName: settings.projectName,
      createdAt: '',  // 不要になったが互換性のため
      lastModified: new Date().toISOString(),
      configFiles
    };

    return NextResponse.json({
      success: true,
      data: {
        ...metadata,
        availableTags: settings.availableTags || ['required', 'nullable', 'string', 'number', 'boolean']
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configFilePaths, availableTags } = body;

    if (!Array.isArray(configFilePaths)) {
      return NextResponse.json(
        { success: false, error: 'configFilePaths must be an array' },
        { status: 400 }
      );
    }

    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const storageService = new StorageService(fsService);

    // 既存の設定を読み込み
    const existingSettings = await fsService.loadProjectSettings();

    // 削除されたファイルのdocsを削除
    const deletedDocsFileNames: string[] = [];
    if (existingSettings && existingSettings.configFiles) {
      const newPaths = new Set(
        configFilePaths.map((p: string) =>
          path.isAbsolute(p) ? path.relative(rootPath, p) : p
        )
      );

      for (const oldPath of existingSettings.configFiles) {
        if (!newPaths.has(oldPath)) {
          const docsFileName = storageService.getDocsFileName(oldPath);
          deletedDocsFileNames.push(docsFileName);
          await fsService.deleteConfigDocs(docsFileName);
        }
      }
    }

    // 絶対パスを相対パスに変換
    const relativePaths = configFilePaths.map((p: string) =>
      path.isAbsolute(p) ? path.relative(rootPath, p) : p
    );

    // 新しい設定を保存
    const newSettings = {
      projectName: existingSettings?.projectName || path.basename(rootPath),
      configFiles: relativePaths,
      availableTags: availableTags || existingSettings?.availableTags || ['required', 'nullable', 'string', 'number', 'boolean'],
      export: existingSettings?.export || {}
    };

    await fsService.saveProjectSettings(newSettings);

    return NextResponse.json({
      success: true,
      message: 'プロジェクト設定を保存しました',
      deletedDocsFiles: deletedDocsFileNames
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
