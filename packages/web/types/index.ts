// types/index.ts

export interface ProjectConfigFiles {
  projectName: string;
  createdAt: string;
  lastModified: string;
  configFiles: ConfigFileInfo[];
}

export interface ConfigFileInfo {
  id: string;
  fileName: string;
  filePath: string;
  docsFileName: string;
}

export interface ConfigDocs {
  configFilePath: string;
  lastModified: string;
  properties: Record<string, PropertyDoc>;
}

export interface PropertyDoc {
  path: string;                    // "Database:ConnectionString"
  description: string;
  notes: string;
  modifiedAt: string;
  modifiedBy: string;
}

export interface ConfigTreeNode {
  key: string;                     // "Database"
  fullPath: string;                // "Database:ConnectionString"
  value: any;
  children?: ConfigTreeNode[];
  hasDocumentation: boolean;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
}

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
}

export type ExportFormat = 'html' | 'markdown';

// チーム共有設定（settings.json）
export interface ProjectSettings {
  fileName?: string;               // 出力ファイル名（拡張子なし、デフォルト: config-doc）
}

// ユーザ個別設定（.user.local.json）
export interface UserSettings {
  format: ExportFormat;            // 出力形式
  autoExport: boolean;             // 保存時に自動エクスポート
  lastExportedAt?: string;         // 最後にエクスポートした日時
}

// 統合された設定（レスポンス用）
export interface ExportSettings extends UserSettings, ProjectSettings {}
