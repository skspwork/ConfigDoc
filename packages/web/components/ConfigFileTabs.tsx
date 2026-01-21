'use client';

import { useState } from 'react';
import { FolderOpenIcon, XIcon } from 'lucide-react';
import { ConfigDocs } from '@/types';

export interface LoadedConfig {
  filePath: string;
  configData: unknown;
  docs: ConfigDocs;
}

interface ConfigFileTabsProps {
  loadedConfigs: LoadedConfig[];
  activeConfigIndex: number;
  onTabClick: (index: number) => void;
  onRemoveConfig: (index: number) => void;
  onAddFileClick: () => void;
  onReorder: (newConfigs: LoadedConfig[], newActiveIndex: number) => void;
}

// 同名ファイルを区別するための表示名を生成
function getDisplayName(filePath: string, allFilePaths: string[]): string {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  // 同じファイル名を持つファイルパスを検索
  const sameNamePaths = allFilePaths.filter(p => {
    const name = p.split(/[/\\]/).pop();
    return name === fileName;
  });

  // 同名のファイルが1つしかない場合はファイル名のみ
  if (sameNamePaths.length === 1) {
    return fileName;
  }

  // 同名ファイルが複数ある場合、親フォルダを追加
  const pathParts = filePath.split(/[/\\]/);

  // 必要な親フォルダのレベル数を決定
  for (let depth = 1; depth < pathParts.length; depth++) {
    const displayWithParents = pathParts.slice(-depth - 1).join('/');

    // この表示名が他の同名ファイルと区別できるかチェック
    const conflicts = sameNamePaths.filter(p => {
      const otherParts = p.split(/[/\\]/);
      const otherDisplay = otherParts.slice(-depth - 1).join('/');
      return displayWithParents === otherDisplay && p !== filePath;
    });

    if (conflicts.length === 0) {
      return displayWithParents;
    }
  }

  // 全パスが必要な場合
  return filePath;
}

export function ConfigFileTabs({
  loadedConfigs,
  activeConfigIndex,
  onTabClick,
  onRemoveConfig,
  onAddFileClick,
  onReorder
}: ConfigFileTabsProps) {
  // ドラッグ＆ドロップ用の状態
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    // 配列の並び替え
    const newConfigs = [...loadedConfigs];
    const [draggedItem] = newConfigs.splice(dragIndex, 1);
    newConfigs.splice(index, 0, draggedItem);

    // アクティブなインデックスを調整
    let newActiveIndex = activeConfigIndex;
    if (activeConfigIndex === dragIndex) {
      newActiveIndex = index;
    } else if (dragIndex < activeConfigIndex && index >= activeConfigIndex) {
      newActiveIndex = activeConfigIndex - 1;
    } else if (dragIndex > activeConfigIndex && index <= activeConfigIndex) {
      newActiveIndex = activeConfigIndex + 1;
    }

    onReorder(newConfigs, newActiveIndex);

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const allFilePaths = loadedConfigs.map(c => c.filePath);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 mb-8 hover:shadow-2xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <FolderOpenIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">設定ファイル</h2>
        </div>
        <button
          onClick={onAddFileClick}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 transform"
        >
          <FolderOpenIcon className="w-5 h-5" />
          <span className="font-medium">ファイルを追加</span>
        </button>
      </div>

      {loadedConfigs.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {loadedConfigs.map((config, index) => (
            <div
              key={config.filePath}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              onClick={() => onTabClick(index)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-grab transition-all duration-200 ${
                activeConfigIndex === index
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-md'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
              } ${
                dragIndex === index ? 'opacity-50' : ''
              } ${
                dragOverIndex === index ? 'border-blue-500 border-dashed' : ''
              }`}
            >
              <span className={`text-sm font-medium ${
                activeConfigIndex === index ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {getDisplayName(config.filePath, allFilePaths)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveConfig(index);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <FolderOpenIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium">設定ファイルを選択してください</p>
          <p className="text-xs text-gray-500 mt-1">「ファイルを追加」ボタンから開始</p>
        </div>
      )}
    </div>
  );
}
