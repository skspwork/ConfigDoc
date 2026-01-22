import { FileSystemService } from './fileSystem';
import { StorageService } from './storage';
import { ConfigParser } from './configParser';

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

        markdown += `#### \`${propertyPath}\`\n\n`;

        // ドキュメントがある場合
        if (doc) {
          if (doc.tags && doc.tags.length > 0) {
            markdown += `**タグ:** ${doc.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
          }

          // フィールドを表示
          if (doc.fields) {
            Object.entries(doc.fields).forEach(([label, value]) => {
              if (value) {
                markdown += `**${label}:**\n\n${value}\n\n`;
              }
            });
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
