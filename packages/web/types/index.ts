// types/index.ts

export interface ProjectMetadata {
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

export type ExportFormat = 'html';

export interface ExportSettings {
  outputPath: string;              // 出力先パス（相対パスまたは絶対パス）
  format: ExportFormat;            // 出力形式
  autoExport: boolean;             // 保存時に自動エクスポート
  lastExportedAt?: string;         // 最後にエクスポートした日時
}
