import fs from 'fs/promises';
import path from 'path';
import { ProjectConfigFiles, ConfigDocs, FileSystemItem, ProjectSettings } from '@/types';
import { parseJSON } from './jsonUtils';

export class FileSystemService {
  private configDocDir = '.config_doc';
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async ensureConfigDocDir(): Promise<void> {
    const dirPath = path.join(this.rootPath, this.configDocDir);
    const metadataDir = path.join(dirPath, 'metadata');
    const docsDir = path.join(metadataDir, 'docs');

    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }

    // metadata/docsフォルダを作成
    await fs.mkdir(docsDir, { recursive: true });
  }

  // 新しいプロジェクト設定の読み込み
  async loadProjectSettings(): Promise<ProjectSettings | null> {
    const settingsPath = path.join(
      this.rootPath,
      this.configDocDir,
      'project_settings.json'
    );
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      return parseJSON(content);
    } catch {
      return null;
    }
  }

  // 新しいプロジェクト設定の保存
  async saveProjectSettings(settings: ProjectSettings): Promise<void> {
    await this.ensureConfigDocDir();
    const settingsPath = path.join(
      this.rootPath,
      this.configDocDir,
      'project_settings.json'
    );
    await fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 2),
      'utf-8'
    );
  }

  // 旧形式のconfig_files.jsonの読み込み（マイグレーション用）
  async loadConfigFiles(): Promise<ProjectConfigFiles | null> {
    const configFilesPath = path.join(
      this.rootPath,
      this.configDocDir,
      'metadata',
      'config_files.json'
    );
    try {
      const content = await fs.readFile(configFilesPath, 'utf-8');
      return parseJSON(content);
    } catch {
      return null;
    }
  }

  async saveConfigFiles(configFiles: ProjectConfigFiles): Promise<void> {
    // ディレクトリが存在することを確認
    await this.ensureConfigDocDir();

    const metadataPath = path.join(
      this.rootPath,
      this.configDocDir,
      'metadata',
      'config_files.json'
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(configFiles, null, 2),
      'utf-8'
    );
  }

  async loadConfigFile(filePath: string): Promise<any> {
    // 絶対パスか相対パスかを判定
    const isAbsolute = path.isAbsolute(filePath);
    const fullPath = isAbsolute ? path.normalize(filePath) : path.join(this.rootPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return parseJSON(content);
  }

  async loadConfigDocs(docsFileName: string): Promise<ConfigDocs | null> {
    const docsPath = path.join(
      this.rootPath,
      this.configDocDir,
      'metadata',
      'docs',
      docsFileName
    );
    try {
      const content = await fs.readFile(docsPath, 'utf-8');
      return parseJSON(content);
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
      'metadata',
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
    // 絶対パスか相対パスかを判定
    const isAbsolute = path.isAbsolute(dirPath);
    const fullPath = isAbsolute ? path.normalize(dirPath) : path.join(this.rootPath, dirPath);

    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    return entries
      .map(entry => {
        // 絶対パスとして返す
        const absolutePath = path.join(fullPath, entry.name);
        return {
          name: entry.name,
          path: absolutePath,
          type: entry.isDirectory() ? 'directory' as const : 'file' as const,
          extension: entry.isFile() ? path.extname(entry.name) : undefined
        };
      })
      .sort((a, b) => {
        // ディレクトリを先に表示
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  async deleteConfigDocs(docsFileName: string): Promise<void> {
    const docsPath = path.join(
      this.rootPath,
      this.configDocDir,
      'metadata',
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
