import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { FileSystemService } from '@/lib/fileSystem';
import { ProjectConfigFiles } from '@/types';
import { getRootPath } from '@/lib/getRootPath';

export async function GET() {
  try {
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);

    const metadata = await fsService.loadConfigFiles();

    return NextResponse.json({
      success: true,
      data: metadata
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
    const { configFilePaths } = body;

    if (!Array.isArray(configFilePaths)) {
      return NextResponse.json(
        { success: false, error: 'configFilePaths must be an array' },
        { status: 400 }
      );
    }

    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);

    // メタデータを作成または更新
    const existingMetadata = await fsService.loadConfigFiles();

    // 削除された設定ファイルの docs.json を削除
    const deletedDocsFileNames: string[] = [];
    if (existingMetadata && existingMetadata.configFiles) {
      const newFilePaths = new Set(configFilePaths);
      for (const oldConfig of existingMetadata.configFiles) {
        if (!newFilePaths.has(oldConfig.filePath)) {
          // この設定ファイルは削除された
          deletedDocsFileNames.push(oldConfig.docsFileName);
          await fsService.deleteConfigDocs(oldConfig.docsFileName);
        }
      }
    }

    const metadata: ProjectConfigFiles = {
      projectName: existingMetadata?.projectName || path.basename(rootPath),
      createdAt: existingMetadata?.createdAt || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      configFiles: configFilePaths.map((filePath, index) => {
        const fileName = filePath.split(/[/\\]/).pop() || 'config.json';
        const docsFileName = fileName.replace('.json', '.docs.json');

        return {
          id: `config-${index + 1}`,
          fileName,
          filePath,
          docsFileName
        };
      })
    };

    await fsService.saveConfigFiles(metadata);

    return NextResponse.json({
      success: true,
      message: 'メタデータを保存しました',
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
