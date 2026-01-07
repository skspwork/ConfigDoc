import { NextRequest, NextResponse } from 'next/server';
import { FileSystemService } from '@/lib/fileSystem';
import { getRootPath } from '@/lib/getRootPath';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { directory } = body;

    if (!directory) {
      return NextResponse.json(
        { success: false, error: 'directory is required' },
        { status: 400 }
      );
    }

    // プロジェクトのルートパス（ユーザーの作業ディレクトリ）
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);

    // ディレクトリ内のファイル一覧を取得
    const items = await fsService.browseDirectory(directory);

    return NextResponse.json({
      success: true,
      data: {
        currentPath: directory,
        items
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
