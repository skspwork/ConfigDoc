import { NextRequest, NextResponse } from 'next/server';
import { HtmlGenerator } from '@/lib/htmlGenerator';
import { FileSystemService } from '@/lib/fileSystem';
import { getRootPath } from '@/lib/getRootPath';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const rootPath = getRootPath();
    const generator = new HtmlGenerator(rootPath);

    // リクエストボディから出力パスを取得（オプション）
    const body = await request.json().catch(() => ({}));
    const customOutputPath = body.outputPath;

    // HTMLを生成
    const html = await generator.generateHtml();

    // 出力パスを決定
    let outputPath: string;
    if (customOutputPath) {
      // カスタムパスが指定されている場合
      outputPath = path.isAbsolute(customOutputPath)
        ? customOutputPath
        : path.join(rootPath, customOutputPath);
    } else {
      // デフォルトは .config_doc/index.html
      const fsService = new FileSystemService(rootPath);
      await fsService.saveHtmlExport(html);
      return NextResponse.json({
        success: true,
        message: 'HTMLファイルを生成しました'
      });
    }

    // ディレクトリを確保
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // HTMLファイルを保存
    await fs.writeFile(outputPath, html, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'HTMLファイルを生成しました',
      outputPath: path.relative(rootPath, outputPath)
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
