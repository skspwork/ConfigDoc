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

  private toRelativePath(filePath: string): string {
    // 絶対パスの場合は相対パスに変換
    if (path.isAbsolute(filePath)) {
      return path.relative(this.fs['rootPath'], filePath);
    }
    return filePath;
  }

  private getDocsFileName(configFilePath: string): string {
    // 絶対パスの場合は、パス全体からハッシュを生成して一意にする
    const isAbsolute = /^[a-zA-Z]:[/\\]/.test(configFilePath) || configFilePath.startsWith('/');

    if (isAbsolute) {
      // 絶対パスの場合：パスを正規化してBase64エンコード（ファイル名として安全な形式）
      const normalized = configFilePath.replace(/[/\\]/g, '_').replace(/:/g, '');
      const fileName = configFilePath.split(/[/\\]/).pop() || 'config.json';
      const baseName = fileName.replace('.json', '');
      // ファイル名の前にパスのハッシュを追加して一意性を確保
      return `${normalized.substring(0, 50)}_${baseName}.docs.json`;
    } else {
      // 相対パスの場合：従来通り
      const fileName = configFilePath.split(/[/\\]/).pop() || 'config.json';
      return fileName.replace('.json', '.docs.json');
    }
  }
}
