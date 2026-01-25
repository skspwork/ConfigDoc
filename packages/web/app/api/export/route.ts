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

    // リクエストボディからフォーマット、ファイル名、出力先フォルダを取得
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { format = 'html' } = body;
    // fileNameが空文字列の場合はデフォルト値を使用
    const fileName = body.fileName?.trim() || 'config-doc';
    // outputDirが空文字列の場合はプロジェクトルートに出力
    const outputDir = body.outputDir?.trim() || '';

    const fsService = new FileSystemService(rootPath);
    await fsService.ensureConfigDocDir();

    // 出力ディレクトリのパスを決定
    const outputDirPath = outputDir
      ? path.join(rootPath, outputDir)
      : rootPath;

    // ディレクトリを確保
    await fs.mkdir(outputDirPath, { recursive: true });

    // Markdown形式の場合はファイルごとに個別のMarkdownファイルを生成
    if (format === 'markdown') {
      const settings = await fsService.loadProjectSettings();
      if (!settings || settings.configFiles.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'ドキュメント化された設定ファイルがありません'
        }, { status: 400 });
      }

      const generator = new MarkdownGenerator(rootPath);
      const outputPaths: string[] = [];

      for (const configFilePath of settings.configFiles) {
        // JSONファイル名から拡張子を除いてMarkdownファイル名を生成
        const configFileName = configFilePath.split(/[/\\]/).pop() || 'config.json';
        const markdownFileName = configFileName.replace(/\.json$/i, '.md');
        const outputPath = path.join(outputDirPath, markdownFileName);

        const content = await generator.generateMarkdownForFile(configFilePath);
        await fs.writeFile(outputPath, content, 'utf-8');
        outputPaths.push(outputPath);
      }

      return NextResponse.json({
        success: true,
        message: `Markdownファイルを${outputPaths.length}件生成しました`,
        outputPaths
      });
    }

    // HTML/Markdownテーブル形式は従来通り単一ファイル
    let content: string;
    if (format === 'markdown-table') {
      const generator = new MarkdownTableGenerator(rootPath);
      content = await generator.generateMarkdownTable();
    } else {
      // デフォルトはHTML
      const generator = new HtmlGenerator(rootPath);
      content = await generator.generateHtml();
    }

    // 出力ファイル名を決定（拡張子付き）
    const extension = format === 'markdown-table' ? 'md' : 'html';
    const outputFileName = `${fileName}.${extension}`;

    // 出力パス
    const outputPath = path.join(outputDirPath, outputFileName);

    // ファイルを保存
    await fs.writeFile(outputPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `${format === 'markdown-table' ? 'Markdownテーブル' : 'HTML'}ファイルを生成しました`,
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
