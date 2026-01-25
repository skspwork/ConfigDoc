import { useState, useEffect, useMemo } from 'react';
import { ExportSettings, ExportFormat } from '@/types';
import { XIcon, DownloadIcon, FolderIcon } from 'lucide-react';
import { FileBrowser } from './FileBrowser';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  currentSettings?: ExportSettings;
  rootPath?: string;
}

const DEFAULT_SETTINGS: ExportSettings = {
  format: 'html',
  autoExport: true,
  fileName: 'config-doc',
  outputDir: '.config_doc/output'
};

export function ExportDialog({ isOpen, onClose, onExport, currentSettings, rootPath = '.' }: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>(currentSettings || DEFAULT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Markdown形式かどうか（ファイルごとに個別出力する形式）
  const isMarkdownFormat = settings.format === 'markdown';

  // フォーマットに応じて出力先パスを決定
  const absoluteOutputPath = useMemo(() => {
    const normalized = rootPath.replace(/\//g, '\\');
    const outputDir = settings.outputDir?.trim() || '';
    const normalizedOutputDir = outputDir ? outputDir.replace(/\//g, '\\') : '';
    const baseDir = normalizedOutputDir ? `${normalized}\\${normalizedOutputDir}` : normalized;

    // Markdown形式の場合はディレクトリのみ表示（ファイルごとに個別出力）
    if (settings.format === 'markdown') {
      return `${baseDir}\\{設定ファイル名}.md`;
    }

    const fileName = settings.fileName || 'config-doc';
    const extension = settings.format === 'markdown-table' ? 'md' : 'html';
    return `${baseDir}\\${fileName}.${extension}`;
  }, [settings.format, settings.fileName, settings.outputDir, rootPath]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(settings);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">エクスポート設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">

          {/* 出力先フォルダ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出力先フォルダ
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.outputDir || ''}
                onChange={(e) => setSettings({ ...settings, outputDir: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="（空欄でプロジェクトルート）"
              />
              <button
                type="button"
                onClick={() => setIsFolderBrowserOpen(true)}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="フォルダを選択"
              >
                <FolderIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              相対パスを入力またはフォルダを選択（空欄でプロジェクトルート、チーム共有設定）
            </p>
          </div>

          {/* ファイル名（Markdown形式以外のみ表示） */}
          {!isMarkdownFormat && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ファイル名
              </label>
              <input
                type="text"
                value={settings.fileName ?? ''}
                onChange={(e) => setSettings({ ...settings, fileName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="config-doc"
              />
              <p className="mt-1 text-xs text-gray-500">
                拡張子なしのファイル名を指定します（空欄でconfig-doc、チーム共有設定）
              </p>
            </div>
          )}

          {/* 出力形式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出力形式
            </label>
            <select
              value={settings.format}
              onChange={(e) => setSettings({ ...settings, format: e.target.value as ExportFormat })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="html">HTML</option>
              <option value="markdown">Markdown</option>
              <option value="markdown-table">Markdown (テーブル形式)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {settings.format === 'html'
                ? 'スタイル付きのHTMLファイルとして出力します'
                : settings.format === 'markdown-table'
                ? 'Markdownテーブル形式で出力します（プロパティ名、説明、値、備考）'
                : '設定ファイルごとに個別のMarkdownファイルとして出力します'}
            </p>
          </div>

          {/* 出力先パス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出力先パス
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 font-mono break-all">
              {absoluteOutputPath}
            </div>
          </div>

          {/* 自動エクスポート */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="auto-export"
                type="checkbox"
                checked={settings.autoExport}
                onChange={(e) => setSettings({ ...settings, autoExport: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="auto-export" className="text-sm font-medium text-gray-700 cursor-pointer">
                保存時に自動エクスポート
              </label>
              <p className="text-xs text-gray-500 mt-1">
                ドキュメントを保存したときに自動的にHTMLファイルを更新します
              </p>
            </div>
          </div>

          {/* 最終エクスポート日時 */}
          {settings.lastExportedAt && (
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500">
                最終エクスポート: {new Date(settings.lastExportedAt).toLocaleString('ja-JP')}
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </button>
        </div>
      </div>

      {/* フォルダ選択ダイアログ */}
      <FileBrowser
        isOpen={isFolderBrowserOpen}
        currentPath={rootPath}
        onSelect={(paths) => {
          if (paths.length > 0) {
            // 絶対パスから相対パスに変換
            const selectedPath = paths[0];
            const normalizedRoot = rootPath.replace(/\\/g, '/');
            const normalizedSelected = selectedPath.replace(/\\/g, '/');
            let relativePath = normalizedSelected;
            if (normalizedSelected.startsWith(normalizedRoot)) {
              relativePath = normalizedSelected.slice(normalizedRoot.length);
              if (relativePath.startsWith('/')) {
                relativePath = relativePath.slice(1);
              }
            }
            // 空の場合は現在のディレクトリ
            if (!relativePath) {
              relativePath = '.';
            }
            setSettings({ ...settings, outputDir: relativePath });
          }
          setIsFolderBrowserOpen(false);
        }}
        onClose={() => setIsFolderBrowserOpen(false)}
        folderSelectMode={true}
        title="出力先フォルダを選択"
      />
    </div>
  );
}
