import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getRootPath } from '@/lib/getRootPath';

export async function GET() {
  try {
    // プロジェクトのルートパスを取得（ユーザーの作業ディレクトリ）
    const rootPath = getRootPath();
    const projectName = path.basename(rootPath);

    // .config_docディレクトリの存在確認
    const ConfigDocPath = path.join(rootPath, '.config_doc');
    let hasConfigDoc = false;

    try {
      await fs.access(ConfigDocPath);
      hasConfigDoc = true;
    } catch {
      hasConfigDoc = false;
    }

    return NextResponse.json({
      success: true,
      data: {
        projectName,
        rootPath,
        hasConfigDoc
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
