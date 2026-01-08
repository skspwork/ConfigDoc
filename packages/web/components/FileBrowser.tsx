'use client';

import { useState, useEffect } from 'react';
import { FileSystemItem } from '@/types';
import { FolderIcon, FileIcon, ChevronUpIcon } from 'lucide-react';

interface FileBrowserProps {
  isOpen: boolean;
  currentPath: string;
  onSelect: (filePaths: string[]) => void;
  onClose: () => void;
  multiSelect?: boolean;
  filterJsonOnly?: boolean;
}

export function FileBrowser({
  isOpen,
  currentPath,
  onSelect,
  onClose,
  multiSelect = false,
  filterJsonOnly = false
}: FileBrowserProps) {
  const [path, setPath] = useState(currentPath);
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // ダイアログが開かれた時、currentPathでパスをリセット
      setPath(currentPath);
      setSelectedFiles([]);
    }
  }, [isOpen, currentPath]);

  useEffect(() => {
    if (isOpen) {
      // パスが変更された時にディレクトリをロード
      loadDirectory(path);
    }
  }, [isOpen, path]);

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/files/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: dirPath })
      });
      const data = await response.json();
      if (data.success) {
        // フィルタリング
        const filtered = filterJsonOnly
          ? data.data.items.filter((item: FileSystemItem) =>
              item.type === 'directory' || item.extension === '.json'
            )
          : data.data.items;
        setItems(filtered);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: FileSystemItem) => {
    if (item.type === 'directory') {
      setPath(item.path);
      // ディレクトリ移動時は選択を保持
    } else {
      if (multiSelect) {
        // 複数選択モード
        setSelectedFiles(prev =>
          prev.includes(item.path)
            ? prev.filter(p => p !== item.path)
            : [...prev, item.path]
        );
      } else {
        // 単一選択モード
        setSelectedFiles([item.path]);
      }
    }
  };

  const handleGoUp = () => {
    // Windowsのパス区切り文字を考慮してパスを正規化
    const normalizedPath = path.replace(/\//g, '\\');
    const pathParts = normalizedPath.split('\\').filter(p => p);

    if (pathParts.length > 1) {
      // 親ディレクトリへ移動
      const parentParts = pathParts.slice(0, -1);

      // パスを再構築
      let parentPath: string;
      if (parentParts.length === 1 && parentParts[0].includes(':')) {
        // ドライブルートの場合（例: C:\ ）
        parentPath = parentParts[0] + '\\';
      } else if (parentParts[0].includes(':')) {
        // ドライブレターを含むパスの場合（例: C:\sksp）
        parentPath = parentParts[0] + '\\' + parentParts.slice(1).join('\\');
      } else {
        // 相対パスの場合
        parentPath = parentParts.join('\\');
      }
      setPath(parentPath);
    } else if (pathParts.length === 1 && !pathParts[0].includes(':')) {
      // ルート以外の単一ディレクトリの場合
      setPath('.');
    }
    // ドライブルート（例: C:\）の場合は何もしない
    // ディレクトリ移動時は選択を保持
  };

  const handleConfirm = () => {
    if (selectedFiles.length > 0) {
      onSelect(selectedFiles);
      setSelectedFiles([]);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">ファイルを選択</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* パスとナビゲーション */}
        <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
          <span className="text-sm text-gray-600 flex-1">パス: {path}</span>
          <button
            onClick={handleGoUp}
            className="p-2 hover:bg-gray-200 rounded"
            title="上のディレクトリへ"
          >
            <ChevronUpIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ファイル一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500">読み込み中...</div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => {
                const isSelected = selectedFiles.includes(item.path);
                return (
                  <div
                    key={item.path}
                    onClick={() => handleItemClick(item)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-100' : ''
                    }`}
                  >
                    {item.type === 'directory' ? (
                      <FolderIcon className="w-5 h-5 text-blue-500" />
                    ) : (
                      <FileIcon className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-sm">{item.name}</span>
                    {isSelected && multiSelect && (
                      <span className="ml-auto text-blue-500">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-4 border-t">
          {multiSelect && selectedFiles.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedFiles.length}件選択中
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedFiles.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              選択
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
