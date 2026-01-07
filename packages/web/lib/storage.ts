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
    const fileName = configFilePath.split(/[/\\]/).pop() || 'config.json';
    return fileName.replace('.json', '.docs.json');
  }
}
