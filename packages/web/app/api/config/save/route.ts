import { NextRequest, NextResponse } from 'next/server';
import { FileSystemService } from '@/lib/fileSystem';
import { StorageService } from '@/lib/storage';
import { getRootPath } from '@/lib/getRootPath';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configFilePath, propertyPath, propertyDoc, properties } = body;

    // configFilePathは必須
    if (!configFilePath) {
      return NextResponse.json(
        { success: false, error: 'Missing configFilePath' },
        { status: 400 }
      );
    }

    // プロジェクトのルートパス（ユーザーの作業ディレクトリ）
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const storageService = new StorageService(fsService);

    // .config_docディレクトリを確保
    await fsService.ensureConfigDocDir();

    // 一括更新モード（propertiesが指定されている場合）
    if (properties) {
      await storageService.updateAllProperties(configFilePath, properties);
    } else if (propertyPath && propertyDoc) {
      // 単一プロパティ更新モード
      await storageService.savePropertyDoc(
        configFilePath,
        propertyPath,
        propertyDoc
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: either (propertyPath, propertyDoc) or properties required' },
        { status: 400 }
      );
    }

    // メタデータの最終更新時刻を更新
    const metadata = await fsService.loadConfigFiles();
    if (metadata) {
      metadata.lastModified = new Date().toISOString();
      await fsService.saveConfigFiles(metadata);
    }

    return NextResponse.json({
      success: true,
      message: 'ドキュメントを保存しました'
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
