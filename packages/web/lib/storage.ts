import { FileSystemService } from './fileSystem';
import { ConfigDocs, PropertyDoc } from '@/types';

export class StorageService {
  constructor(private fs: FileSystemService) {}

  async savePropertyDoc(
    configFilePath: string,
    propertyPath: string,
    propertyDoc: PropertyDoc
  ): Promise<void> {
    const docsFileName = this.getDocsFileName(configFilePath);

    let docs = await this.fs.loadConfigDocs(docsFileName);
    if (!docs) {
      docs = {
        configFilePath,
        lastModified: new Date().toISOString(),
        properties: {}
      };
    }

    docs.properties[propertyPath] = propertyDoc;
    docs.lastModified = new Date().toISOString();

    await this.fs.saveConfigDocs(docsFileName, docs);
  }

  async loadAllDocs(configFilePath: string): Promise<ConfigDocs> {
    const docsFileName = this.getDocsFileName(configFilePath);
    const docs = await this.fs.loadConfigDocs(docsFileName);

    return docs || {
      configFilePath,
      lastModified: new Date().toISOString(),
      properties: {}
    };
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
