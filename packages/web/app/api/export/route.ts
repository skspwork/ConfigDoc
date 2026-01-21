import { NextRequest, NextResponse } from 'next/server';
import { HtmlGenerator } from '@/lib/htmlGenerator';
import { MarkdownGenerator } from '@/lib/markdownGenerator';
import { MarkdownTableGenerator } from '@/lib/markdownTableGenerator';
import { FileSystemService } from '@/lib/fileSystem';
import { getRootPath } from '@/lib/getRootPath';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const rootPath = getRootPath();

    // リクエストボディからフォーマットとファイル名を取得
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { format = 'html', fileName = 'config-doc' } = body;

    // フォーマットに応じてジェネレーターを選択
    let content: string;

    if (format === 'markdown') {
      const generator = new MarkdownGenerator(rootPath);
      content = await generator.generateMarkdown();
    } else if (format === 'markdown-table') {
      const generator = new MarkdownTableGenerator(rootPath);
      content = await generator.generateMarkdownTable();
    } else {
      // デフォルトはHTML
      const generator = new HtmlGenerator(rootPath);
      content = await generator.generateHtml();
    }

    // 出力ファイル名を決定（拡張子付き）
    const extension = (format === 'markdown' || format === 'markdown-table') ? 'md' : 'html';
    const outputFileName = `${fileName}.${extension}`;

    // 出力パス: .config_doc/output/{fileName}.{extension}
    const fsService = new FileSystemService(rootPath);
    await fsService.ensureConfigDocDir();
    const outputPath = path.join(rootPath, '.config_doc', 'output', outputFileName);

    // ディレクトリを確保
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // ファイルを保存
    await fs.writeFile(outputPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `${format === 'markdown' ? 'Markdown' : 'HTML'}ファイルを生成しました`,
      outputPath
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
