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
  tags?: string[];                 // タグ（例: ["required", "string", "int", "bool"]）
  fields: Record<string, string>;  // フィールド（デフォルト: { "説明": "" }）
  modifiedAt: string;
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

export type ExportFormat = 'html' | 'markdown' | 'markdown-table';

// デフォルトフィールド
export const DEFAULT_FIELDS: Record<string, string> = { '説明': '' };

// プロジェクト設定（project_settings.json）- チーム共有
export interface ProjectSettings {
  projectName: string;
  configFiles: string[];           // 設定ファイルの相対パス配列
  availableTags?: string[];        // 利用可能なタグ（デフォルト: ['required', 'string', 'int', 'bool']）
  fields?: Record<string, string>; // プロジェクトのフィールド定義（デフォルト: { "説明": "" }）
  export?: {
    fileName?: string;             // 出力ファイル名（拡張子なし、デフォルト: config-doc）
    outputDir?: string;            // 出力先フォルダ（相対パス、デフォルト: .config_doc/output）
  };
}

// ユーザ個別設定（.user_settings.json）
export interface UserSettings {
  format: ExportFormat;            // 出力形式
  autoExport: boolean;             // 保存時に自動エクスポート
  lastExportedAt?: string;         // 最後にエクスポートした日時
}

// 統合された設定（レスポンス用）
export interface ExportSettings extends UserSettings {
  fileName?: string;               // ProjectSettings.export.fileName から取得
  outputDir?: string;              // ProjectSettings.export.outputDir から取得
}
