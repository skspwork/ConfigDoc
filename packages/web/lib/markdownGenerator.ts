import { FileSystemService } from './fileSystem';
import { StorageService } from './storage';
import path from 'path';

export class MarkdownGenerator {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async generateMarkdown(): Promise<string> {
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

      markdown += `## ${configFile.fileName}\n\n`;
      markdown += `**ファイルパス:** \`${configFile.filePath}\`\n\n`;

      const propertyEntries = Object.entries(docs.properties);
      if (propertyEntries.length === 0) {
        markdown += '*ドキュメントが登録されていません。*\n\n';
        continue;
      }

      markdown += '### プロパティ一覧\n\n';

      for (const [propertyPath, doc] of propertyEntries) {
        markdown += `#### \`${propertyPath}\`\n\n`;

        if (doc.description) {
          markdown += `**説明:**\n\n${doc.description}\n\n`;
        }

        if (doc.notes) {
          markdown += `**備考:**\n\n${doc.notes}\n\n`;
        }

        markdown += `*最終更新: ${new Date(doc.modifiedAt).toLocaleString('ja-JP')} by ${doc.modifiedBy}*\n\n`;
        markdown += '---\n\n';
      }
    }

    markdown += `\n*このドキュメントは [ConfigDoc](https://github.com/your-repo/configdoc) により自動生成されました。*\n`;

    return markdown;
  }
}
