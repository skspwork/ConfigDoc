import { FileSystemService } from './fileSystem';
import { StorageService } from './storage';
import { escapeTableCell, getPropertyByPath, formatValue } from './utils';
import { ConfigParser } from './configParser';
import { sortTagsByOrder } from './configManagerUtils';

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

    // フィールドの順序を取得（「説明」以外をテーブルの列として使用）
    const fieldKeys = settings.fields ? Object.keys(settings.fields) : [];
    const nonDescriptionFields = fieldKeys.filter(key => key !== '説明');

    // タグの順序を取得
    const availableTags = settings.availableTags || [];

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
      // ツリー構造の順序を保持するためソートしない
      const allPropertyPaths = ConfigParser.getAllPropertyPaths(configData);

      if (allPropertyPaths.length === 0) {
        markdown += '*プロパティがありません。*\n\n';
        continue;
      }

      // テーブルヘッダー（projectFieldsの順序で表示）
      markdown += '| プロパティ名 | タグ | 値 |';
      nonDescriptionFields.forEach(label => {
        markdown += ` ${label} |`;
      });
      markdown += '\n';

      markdown += '|-------------|------|-----|';
      nonDescriptionFields.forEach(() => {
        markdown += '------|';
      });
      markdown += '\n';

      // 各プロパティの行を追加
      for (const propertyPath of allPropertyPaths) {
        const doc = docs.properties[propertyPath];
        const propertyName = escapeTableCell(propertyPath);
        const sortedTags = doc && doc.tags && doc.tags.length > 0
          ? sortTagsByOrder(doc.tags, availableTags)
          : [];
        const tags = sortedTags.length > 0
          ? escapeTableCell(sortedTags.map(tag => `\`${tag}\``).join(', '))
          : '-';

        const value = this.getPropertyValue(configData, propertyPath);
        const valueStr = escapeTableCell(value);

        markdown += `| ${propertyName} | ${tags} | ${valueStr} |`;

        // フィールドの値をprojectFieldsの順序で追加（説明以外）
        nonDescriptionFields.forEach(label => {
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
