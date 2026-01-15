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

    // プロジェクト設定を読み込む
    const settings = await fsService.loadProjectSettings();
    if (!settings || settings.configFiles.length === 0) {
      return '# 設定ファイルドキュメント\n\nドキュメント化された設定ファイルがありません。\n';
    }

    let markdown = '# 設定ファイルドキュメント\n\n';
    markdown += `プロジェクト: **${settings.projectName}**\n\n`;
    markdown += `最終更新: ${new Date().toLocaleString('ja-JP')}\n\n`;
    markdown += '---\n\n';

    // 各設定ファイルのドキュメントを生成
    for (const filePath of settings.configFiles) {
      const fileName = filePath.split(/[/\\]/).pop() || 'config.json';
      const docs = await storageService.loadAllDocs(filePath);
      const configData = await fsService.loadConfigFile(filePath);

      markdown += `## ${fileName}\n\n`;
      markdown += `**ファイルパス:** \`${filePath}\`\n\n`;

      const propertyEntries = Object.entries(docs.properties);
      if (propertyEntries.length === 0) {
        markdown += '*ドキュメントが登録されていません。*\n\n';
        continue;
      }

      // すべてのカスタムフィールドラベルを収集
      const customFieldLabels = new Set<string>();
      propertyEntries.forEach(([_, doc]) => {
        if (doc.customFields) {
          Object.keys(doc.customFields).forEach(label => customFieldLabels.add(label));
        }
      });
      const sortedLabels = Array.from(customFieldLabels).sort();

      // テーブルヘッダー
      markdown += '| プロパティ名 | タグ | 説明 | 値 |';
      sortedLabels.forEach(label => {
        markdown += ` ${label} |`;
      });
      markdown += '\n';

      markdown += '|-------------|------|------|-----|';
      sortedLabels.forEach(() => {
        markdown += '------|';
      });
      markdown += '\n';

      // 各プロパティの行を追加
      for (const [propertyPath, doc] of propertyEntries) {
        const propertyName = this.escapeTableCell(propertyPath);
        const tags = doc.tags && doc.tags.length > 0
          ? this.escapeTableCell(doc.tags.map(tag => `\`${tag}\``).join(', '))
          : '-';
        const description = this.escapeTableCell(doc.description || '-');
        const value = this.getPropertyValue(configData, propertyPath);
        const valueStr = this.escapeTableCell(value);

        markdown += `| ${propertyName} | ${tags} | ${description} | ${valueStr} |`;

        // カスタムフィールドの値を追加
        sortedLabels.forEach(label => {
          const fieldValue = doc.customFields?.[label] || '-';
          markdown += ` ${this.escapeTableCell(fieldValue)} |`;
        });

        markdown += '\n';
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
