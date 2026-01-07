import { NextRequest, NextResponse } from 'next/server';
import { FileSystemService } from '@/lib/fileSystem';
import { StorageService } from '@/lib/storage';
import { HtmlGenerator } from '@/lib/htmlGenerator';
import { getRootPath } from '@/lib/getRootPath';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configFilePath, propertyPath, propertyDoc } = body;

    if (!configFilePath || !propertyPath || !propertyDoc) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // プロジェクトのルートパス（ユーザーの作業ディレクトリ）
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const storageService = new StorageService(fsService);

    // .config_docディレクトリを確保
    await fsService.ensureConfigDocDir();

    // ドキュメントを保存
    await storageService.savePropertyDoc(
      configFilePath,
      propertyPath,
      propertyDoc
    );

    // メタデータの最終更新時刻を更新
    const metadata = await fsService.loadMetadata();
    if (metadata) {
      metadata.lastModified = new Date().toISOString();
      await fsService.saveMetadata(metadata);
    }

    // HTMLを自動生成
    try {
      const htmlGenerator = new HtmlGenerator(rootPath);
      const html = await htmlGenerator.generateHtml();
      await fsService.saveHtmlExport(html);
    } catch (htmlError) {
      console.error('HTML generation failed:', htmlError);
      // HTML生成エラーは警告のみ（ドキュメント保存は成功）
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
