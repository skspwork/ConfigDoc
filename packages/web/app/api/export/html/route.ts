import { NextResponse } from 'next/server';
import { HtmlGenerator } from '@/lib/htmlGenerator';
import { FileSystemService } from '@/lib/fileSystem';
import { getRootPath } from '@/lib/getRootPath';

export async function POST() {
  try {
    const rootPath = getRootPath();
    const generator = new HtmlGenerator(rootPath);
    const fsService = new FileSystemService(rootPath);

    // HTMLを生成
    const html = await generator.generateHtml();

    // .config_doc/index.html に保存
    await fsService.saveHtmlExport(html);

    return NextResponse.json({
      success: true,
      message: 'HTMLファイルを生成しました'
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
