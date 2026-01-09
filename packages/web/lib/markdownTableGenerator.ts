import { FileSystemService } from './fileSystem';
import { StorageService } from './storage';
import path from 'path';

export class MarkdownTableGenerator {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async generateMarkdownTable(): Promise<string> {
    const fsService = new FileSystemService(this.rootPath);
    const storageService = new StorageService(fsService);

    // メタデータを読み込む
    const configFiles = await fsService.loadConfigFiles();
    if (!configFiles || configFiles.configFiles.length === 0) {
      return '# 設定ファイルドキュメント\n\nドキュメント化された設定ファイルがありません。\n';
    }

    let markdown = '# 設定ファイルドキュメント\n\n';
    markdown += `プロジェクト: **${configFiles.projectName}**\n\n`;
    markdown += `最終更新: ${new Date(configFiles.lastModified).toLocaleString('ja-JP')}\n\n`;
    markdown += '---\n\n';

    // 各設定ファイルのドキュメントを生成
    for (const configFile of configFiles.configFiles) {
      const docs = await storageService.loadAllDocs(configFile.filePath);
      const configData = await fsService.loadConfigFile(configFile.filePath);

      markdown += `## ${configFile.fileName}\n\n`;
      markdown += `**ファイルパス:** \`${configFile.filePath}\`\n\n`;

      const propertyEntries = Object.entries(docs.properties);
      if (propertyEntries.length === 0) {
        markdown += '*ドキュメントが登録されていません。*\n\n';
        continue;
      }

      // テーブルヘッダー
      markdown += '| プロパティ名 | 説明 | 値 | 備考 |\n';
      markdown += '|-------------|------|-----|------|\n';

      // 各プロパティの行を追加
      for (const [propertyPath, doc] of propertyEntries) {
        const propertyName = this.escapeTableCell(propertyPath);
        const description = this.escapeTableCell(doc.description || '-');
        const value = this.getPropertyValue(configData, propertyPath);
        const valueStr = this.escapeTableCell(value);
        const notes = this.escapeTableCell(doc.notes || '-');

        markdown += `| ${propertyName} | ${description} | ${valueStr} | ${notes} |\n`;
      }

      markdown += '\n';
    }

    markdown += `\n*このドキュメントは [ConfigDoc](https://github.com/your-repo/configdoc) により自動生成されました。*\n`;

    return markdown;
  }

  private getPropertyValue(configData: any, propertyPath: string): string {
    const keys = propertyPath.split(':');
    let value = configData;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return '-';
      }
    }

    // 値を文字列に変換
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private escapeTableCell(text: string): string {
    // Markdownテーブルのセル内で特殊文字をエスケープ
    return text
      .replace(/\|/g, '\\|')  // パイプをエスケープ
      .replace(/\n/g, '<br>') // 改行をHTMLのbrタグに変換
      .replace(/\r/g, '');     // キャリッジリターンを削除
  }
}
