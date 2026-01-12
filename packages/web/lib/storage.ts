import { FileSystemService } from './fileSystem';
import { ConfigDocs, PropertyDoc } from '@/types';
import path from 'path';

export class StorageService {
  constructor(private fs: FileSystemService) {}

  async savePropertyDoc(
    configFilePath: string,
    propertyPath: string,
    propertyDoc: PropertyDoc
  ): Promise<void> {
    const docsFileName = this.getDocsFileName(configFilePath);

    // 絶対パスを相対パスに変換
    const relativeConfigPath = this.toRelativePath(configFilePath);

    let docs = await this.fs.loadConfigDocs(docsFileName);
    if (!docs) {
      docs = {
        configFilePath: relativeConfigPath,
        lastModified: new Date().toISOString(),
        properties: {}
      };
    }

    docs.properties[propertyPath] = propertyDoc;
    docs.lastModified = new Date().toISOString();
    docs.configFilePath = relativeConfigPath; // 常に相対パスを保存

    await this.fs.saveConfigDocs(docsFileName, docs);
  }

  async loadAllDocs(configFilePath: string): Promise<ConfigDocs> {
    const docsFileName = this.getDocsFileName(configFilePath);
    const docs = await this.fs.loadConfigDocs(docsFileName);

    // 絶対パスを相対パスに変換
    const relativeConfigPath = this.toRelativePath(configFilePath);

    return docs || {
      configFilePath: relativeConfigPath,
      lastModified: new Date().toISOString(),
      properties: {}
    };
  }

  // 公開メソッド: docsファイル名を取得
  public getDocsFileName(configFilePath: string): string {
    // 相対パスに変換してから処理
    const relativePath = this.toRelativePath(configFilePath);

    // パスの深さが1以下（ルート直下のファイル）の場合は、シンプルなファイル名
    const pathParts = relativePath.split(/[/\\]/).filter(p => p && p !== '.');

    if (pathParts.length <= 1) {
      // ルート直下のファイル: components.json → components.docs.json
      const fileName = pathParts[0] || 'config.json';
      return fileName.replace('.json', '.docs.json');
    } else {
      // サブディレクトリのファイル: 相対パスを含めて一意にする
      // 例: ../SimMoney/components.json → __SimMoney_components.docs.json
      // 例: sample/appsettings.json → sample_appsettings.docs.json
      const normalized = relativePath
        .replace(/\.\./g, '__')  // .. を __ に変換
        .replace(/[/\\]/g, '_')  // / と \ を _ に変換
        .replace(/:/g, '');       // : を削除
      return normalized.replace('.json', '.docs.json');
    }
  }

  private toRelativePath(filePath: string): string {
    // 絶対パスの場合は相対パスに変換
    if (path.isAbsolute(filePath)) {
      return path.relative(this.fs['rootPath'], filePath);
    }
    return filePath;
  }
}
