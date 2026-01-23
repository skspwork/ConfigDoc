import { FileSystemService } from './fileSystem';
import { StorageService } from './storage';
import { ConfigParser } from './configParser';
import { sortTagsByOrder } from './configManagerUtils';
import { getPropertyByPath } from './utils';

export class MarkdownGenerator {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async generateMarkdown(): Promise<string> {
    const fsService = new FileSystemService(this.rootPath);
    const storageService = new StorageService(fsService);

    // プロジェクト設定を読み込む
    const settings = await fsService.loadProjectSettings();
    if (!settings || settings.configFiles.length === 0) {
      return '# 設定ファイルドキュメント\n\nドキュメント化された設定ファイルがありません。\n';
    }

    // フィールドの順序を取得
    const fieldKeys = settings.fields ? Object.keys(settings.fields) : [];

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

      markdown += '### プロパティ一覧\n\n';

      for (const propertyPath of allPropertyPaths) {
        const doc = docs.properties[propertyPath];
        const value = getPropertyByPath(configData, propertyPath);

        markdown += `#### \`${propertyPath}\`\n\n`;

        // 値を表示（プリミティブ値とプリミティブ配列）
        if (value !== undefined && value !== null) {
          const valueType = typeof value;
          const isArray = Array.isArray(value);
          const isObject = valueType === 'object' && !isArray;

          if (isArray) {
            // 配列の場合：要素がプリミティブならば表示
            const hasPrimitiveElements = value.length > 0 && value.every((item: any) =>
              typeof item !== 'object' || item === null
            );
            if (hasPrimitiveElements) {
              markdown += `**値:** \`${JSON.stringify(value)}\`\n\n`;
            }
          } else if (!isObject) {
            // プリミティブ値を表示
            markdown += `**値:** \`${String(value)}\`\n\n`;
          }
        }

        // ドキュメントがある場合
        if (doc) {
          if (doc.tags && doc.tags.length > 0) {
            const sortedTags = sortTagsByOrder(doc.tags, availableTags);
            markdown += `**タグ:** ${sortedTags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
          }

          // フィールドをprojectFieldsの順序で表示
          if (doc.fields) {
            for (const fieldKey of fieldKeys) {
              const fieldValue = doc.fields[fieldKey];
              if (fieldValue) {
                markdown += `**${fieldKey}:**\n\n${fieldValue}\n\n`;
              }
            }
          }
        } else {
          // ドキュメントがない場合
          markdown += '*ドキュメントなし*\n\n';
        }

        markdown += '---\n\n';
      }
    }

    markdown += `\n*このドキュメントは ConfigDoc により自動生成されました。*\n`;

    return markdown;
  }
}
