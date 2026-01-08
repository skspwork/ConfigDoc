import { useState, useEffect } from 'react';
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
  outputPath: '.config_doc/index.html',
  format: 'html',
  autoExport: true
};

export function ExportDialog({ isOpen, onClose, onExport, currentSettings, rootPath = '.' }: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>(currentSettings || DEFAULT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

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

  const handleFileSelect = (filePaths: string[]) => {
    if (filePaths.length > 0) {
      setSettings({ ...settings, outputPath: filePaths[0] });
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
          {/* 出力先パス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出力先パス
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={settings.outputPath}
                  onChange={(e) => setSettings({ ...settings, outputPath: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder=".config_doc/index.html"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsFileBrowserOpen(true)}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="ファイルを選択"
              >
                <FolderIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              実行ディレクトリからの相対パスまたは絶対パス
            </p>
          </div>

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
            </select>
            <p className="mt-1 text-xs text-gray-500">
              現在はHTMLのみサポートしています
            </p>
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
            disabled={isExporting || !settings.outputPath}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </button>
        </div>
      </div>

      {/* ファイルブラウザ */}
      <FileBrowser
        isOpen={isFileBrowserOpen}
        currentPath={rootPath}
        onSelect={handleFileSelect}
        onClose={() => setIsFileBrowserOpen(false)}
        multiSelect={false}
        filterJsonOnly={false}
      />
    </div>
  );
}
