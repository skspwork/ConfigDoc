import { NextRequest, NextResponse } from 'next/server';
import { FileSystemService } from '@/lib/fileSystem';
import { StorageService } from '@/lib/storage';
import { getRootPath } from '@/lib/getRootPath';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const { configFilePath, associativeArrays } = body;

    if (!configFilePath) {
      return NextResponse.json(
        { success: false, error: 'configFilePath is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(associativeArrays)) {
      return NextResponse.json(
        { success: false, error: 'associativeArrays must be an array' },
        { status: 400 }
      );
    }

    // プロジェクトのルートパス（ユーザーの作業ディレクトリ）
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const storageService = new StorageService(fsService);

    // .config_docディレクトリを確保
    await fsService.ensureConfigDocDir();

    // 連想配列設定を保存
    await storageService.saveAssociativeArrays(configFilePath, associativeArrays);

    return NextResponse.json({
      success: true,
      message: '連想配列設定を保存しました'
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
