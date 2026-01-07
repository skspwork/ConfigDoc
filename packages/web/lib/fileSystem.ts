import fs from 'fs/promises';
import path from 'path';
import { ProjectMetadata, ConfigDocs, FileSystemItem } from '@/types';

export class FileSystemService {
  private configDocDir = '.config_doc';
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async ensureConfigDocDir(): Promise<void> {
    const dirPath = path.join(this.rootPath, this.configDocDir);
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.mkdir(path.join(dirPath, 'docs'), { recursive: true });
    }
  }

  async loadMetadata(): Promise<ProjectMetadata | null> {
    const metadataPath = path.join(
      this.rootPath,
      this.configDocDir,
      'metadata.json'
    );
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async saveMetadata(metadata: ProjectMetadata): Promise<void> {
    // ディレクトリが存在することを確認
    await this.ensureConfigDocDir();

    const metadataPath = path.join(
      this.rootPath,
      this.configDocDir,
      'metadata.json'
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
  }

  async loadConfigFile(filePath: string): Promise<any> {
    const fullPath = path.join(this.rootPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  async loadConfigDocs(docsFileName: string): Promise<ConfigDocs | null> {
    const docsPath = path.join(
      this.rootPath,
      this.configDocDir,
      'docs',
      docsFileName
    );
    try {
      const content = await fs.readFile(docsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async saveConfigDocs(
    docsFileName: string,
    docs: ConfigDocs
  ): Promise<void> {
    // ディレクトリが存在することを確認
    await this.ensureConfigDocDir();

    const docsPath = path.join(
      this.rootPath,
      this.configDocDir,
      'docs',
      docsFileName
    );

    // ファイルの親ディレクトリを確保（サブディレクトリ対応）
    const docsDir = path.dirname(docsPath);
    await fs.mkdir(docsDir, { recursive: true });

    await fs.writeFile(
      docsPath,
      JSON.stringify(docs, null, 2),
      'utf-8'
    );
  }

  async browseDirectory(dirPath: string): Promise<FileSystemItem[]> {
    const fullPath = path.join(this.rootPath, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    return entries
      .filter(entry => !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        type: entry.isDirectory() ? 'directory' as const : 'file' as const,
        extension: entry.isFile() ? path.extname(entry.name) : undefined
      }))
      .sort((a, b) => {
        // ディレクトリを先に表示
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  async saveHtmlExport(html: string): Promise<void> {
    await this.ensureConfigDocDir();
    const htmlPath = path.join(this.rootPath, this.configDocDir, 'index.html');
    await fs.writeFile(htmlPath, html, 'utf-8');
  }

  async deleteConfigDocs(docsFileName: string): Promise<void> {
    const docsPath = path.join(
      this.rootPath,
      this.configDocDir,
      'docs',
      docsFileName
    );
    try {
      await fs.unlink(docsPath);
    } catch {
      // ファイルが存在しない場合は無視
      console.log(`Docs file not found: ${docsFileName}`);
    }
  }
}
