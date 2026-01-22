import { FileSystemService } from './fileSystem';
import { StorageService } from './storage';
import { escapeTableCell, getPropertyByPath, formatValue } from './utils';
import { ConfigParser } from './configParser';

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

      // 設定ファイルから全プロパティを取得（オブジェクト型も含む）
      const allPropertyPaths = ConfigParser.getAllPropertyPaths(configData).sort();

      if (allPropertyPaths.length === 0) {
        markdown += '*プロパティがありません。*\n\n';
        continue;
      }

      // すべてのフィールドラベルを収集（説明以外）
      const fieldLabels = new Set<string>();
      allPropertyPaths.forEach(propertyPath => {
        const doc = docs.properties[propertyPath];
        if (doc && doc.fields) {
          Object.keys(doc.fields).forEach(label => {
            if (label !== '説明') {
              fieldLabels.add(label);
            }
          });
        }
      });
      const sortedLabels = Array.from(fieldLabels).sort();

      // テーブルヘッダー
      markdown += '| プロパティ名 | タグ | 値 |';
      sortedLabels.forEach(label => {
        markdown += ` ${label} |`;
      });
      markdown += '\n';

      markdown += '|-------------|------|-----|';
      sortedLabels.forEach(() => {
        markdown += '------|';
      });
      markdown += '\n';

      // 各プロパティの行を追加
      for (const propertyPath of allPropertyPaths) {
        const doc = docs.properties[propertyPath];
        const propertyName = escapeTableCell(propertyPath);
        const tags = doc && doc.tags && doc.tags.length > 0
          ? escapeTableCell(doc.tags.map(tag => `\`${tag}\``).join(', '))
          : '-';

        const value = this.getPropertyValue(configData, propertyPath);
        const valueStr = escapeTableCell(value);

        markdown += `| ${propertyName} | ${tags} | ${valueStr} |`;

        // フィールドの値を追加（説明以外）
        sortedLabels.forEach(label => {
          const fieldValue = (doc && doc.fields && doc.fields[label]) || '-';
          markdown += ` ${escapeTableCell(fieldValue)} |`;
        });

        markdown += '\n';
      }

      markdown += '\n';
    }

    markdown += `\n*このドキュメントは ConfigDoc により自動生成されました。*\n`;

    return markdown;
  }

  private getPropertyValue(configData: unknown, propertyPath: string): string {
    const value = getPropertyByPath(configData, propertyPath);
    return formatValue(value);
  }
}
