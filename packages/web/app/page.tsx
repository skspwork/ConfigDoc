'use client';

import { useState, useEffect } from 'react';
import { ConfigDocs, PropertyDoc } from '@/types';
import { ConfigTree } from '@/components/ConfigTree';
import { FileBrowser } from '@/components/FileBrowser';
import { ToastContainer, ToastType } from '@/components/Toast';
import { FolderOpenIcon, XIcon, SaveIcon } from 'lucide-react';

interface LoadedConfig {
  filePath: string;
  configData: any;
  docs: ConfigDocs;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export default function Home() {
  const [loadedConfigs, setLoadedConfigs] = useState<LoadedConfig[]>([]);
  const [activeConfigIndex, setActiveConfigIndex] = useState<number>(0);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 編集中のプロパティドキュメント
  const [editingDoc, setEditingDoc] = useState<PropertyDoc | null>(null);
  const [originalDoc, setOriginalDoc] = useState<PropertyDoc | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // トースト通知
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 差分チェック関数
  const checkForChanges = (current: PropertyDoc | null, original: PropertyDoc | null): boolean => {
    if (!current || !original) return false;

    // 説明の比較
    if (current.description !== original.description) return true;

    // 備考の比較
    if (current.notes !== original.notes) return true;

    return false;
  };

  const activeConfig = loadedConfigs[activeConfigIndex];

  // 初期化時にメタデータから設定ファイルリストを読み込む
  useEffect(() => {
    const loadSavedConfigs = async () => {
      try {
        const response = await fetch('/api/project');
        const result = await response.json();

        if (result.success && result.data.hasConfigDoc) {
          // メタデータを読み込む
          const metaResponse = await fetch('/api/config/metadata');
          const metaResult = await metaResponse.json();

          if (metaResult.success && metaResult.data?.configFiles) {
            // 保存されている設定ファイルを読み込む
            for (const configFile of metaResult.data.configFiles) {
              await loadConfigFile(configFile.filePath);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load saved configs:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadSavedConfigs();
  }, []);

  const loadConfigFile = async (filePath: string) => {
    try {
      const response = await fetch('/api/config/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });

      const result = await response.json();
      if (result.success) {
        setLoadedConfigs(prev => {
          // 重複チェック
          if (prev.some(c => c.filePath === filePath)) {
            return prev;
          }
          return [...prev, {
            filePath,
            configData: result.data.configData,
            docs: result.data.docs
          }];
        });
      }
    } catch (error) {
      console.error('Failed to load config file:', error);
    }
  };

  // メタデータを更新する
  const updateMetadata = async (configFilePaths: string[]) => {
    try {
      const response = await fetch('/api/config/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configFilePaths })
      });

      const result = await response.json();

      // 削除された docs ファイルがある場合、通知を表示
      if (result.deletedDocsFiles && result.deletedDocsFiles.length > 0) {
        showToast(
          `${result.deletedDocsFiles.length}件のドキュメントファイルを削除しました`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  };

  const handleSelectConfigFiles = async (filePaths: string[]) => {
    const newConfigs: LoadedConfig[] = [];

    for (const filePath of filePaths) {
      // 既に読み込まれているか確認
      if (loadedConfigs.some(c => c.filePath === filePath)) {
        continue;
      }

      try {
        const response = await fetch('/api/config/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath })
        });

        const result = await response.json();
        if (result.success) {
          newConfigs.push({
            filePath,
            configData: result.data.configData,
            docs: result.data.docs
          });
        } else {
          showToast(`設定ファイルの読み込みに失敗しました (${filePath}): ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        showToast(`設定ファイルの読み込み中にエラーが発生しました: ${filePath}`, 'error');
      }
    }

    if (newConfigs.length > 0) {
      setLoadedConfigs(prev => {
        const updated = [...prev, ...newConfigs];
        // メタデータを更新
        updateMetadata(updated.map(c => c.filePath));
        return updated;
      });
    }
  };

  const handleRemoveConfig = async (index: number) => {
    const configToRemove = loadedConfigs[index];

    // 削除される設定ファイルの docs.json が存在するか確認
    if (configToRemove.docs && Object.keys(configToRemove.docs.properties).length > 0) {
      if (!confirm('既に説明文が設定されていますが、削除してよろしいですか？')) {
        return;
      }
    }

    setLoadedConfigs(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // メタデータを更新
      updateMetadata(updated.map(c => c.filePath));
      return updated;
    });
    if (activeConfigIndex >= index && activeConfigIndex > 0) {
      setActiveConfigIndex(activeConfigIndex - 1);
    }
    setSelectedPath('');
    setEditingDoc(null);
    setHasUnsavedChanges(false);
  };

  const handleSelectProperty = (path: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('保存されていない変更があります。破棄しますか？')) {
        return;
      }
    }

    setSelectedPath(path);
    const existingDoc = activeConfig.docs.properties[path];

    if (existingDoc) {
      const docCopy = { ...existingDoc };
      setEditingDoc(docCopy);
      setOriginalDoc(docCopy);
    } else {
      // 新規ドキュメント
      const newDoc = {
        path,
        description: '',
        notes: '',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'user'
      };
      setEditingDoc(newDoc);
      setOriginalDoc(newDoc);
    }
    setHasUnsavedChanges(false);
  };

  const handleSaveProperty = async () => {
    if (!editingDoc || !activeConfig) return;

    try {
      const propertyDoc = {
        ...editingDoc,
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'user'
      };

      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configFilePath: activeConfig.filePath,
          propertyPath: selectedPath,
          propertyDoc
        })
      });

      const result = await response.json();
      if (result.success) {
        // ドキュメントを更新
        setLoadedConfigs(prev => prev.map((config, idx) =>
          idx === activeConfigIndex
            ? {
                ...config,
                docs: {
                  ...config.docs,
                  properties: {
                    ...config.docs.properties,
                    [selectedPath]: propertyDoc
                  }
                }
              }
            : config
        ));
        setEditingDoc(propertyDoc);
        setOriginalDoc(propertyDoc);
        setHasUnsavedChanges(false);
        showToast('保存しました');
      } else {
        showToast('保存に失敗しました: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('保存中にエラーが発生しました', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            ConfigDoc Web
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        {/* ファイル選択セクション */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">設定ファイル</h2>
            <button
              onClick={() => setIsFileBrowserOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <FolderOpenIcon className="w-5 h-5" />
              ファイルを追加
            </button>
          </div>

          {loadedConfigs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {loadedConfigs.map((config, index) => (
                <div
                  key={config.filePath}
                  onClick={() => {
                    setActiveConfigIndex(index);
                    setSelectedPath('');
                    setEditingDoc(null);
                    setHasUnsavedChanges(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
                    activeConfigIndex === index
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm">{config.filePath.split(/[/\\]/).pop()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConfig(index);
                    }}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              設定ファイルを選択してください
            </div>
          )}
        </div>

        {/* ツリーと詳細パネル */}
        {activeConfig && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左パネル: JSON構造ツリー */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-col max-h-[calc(100vh-250px)]">
              <h2 className="text-lg font-semibold mb-3">JSON構造</h2>
              <div className="overflow-y-auto flex-1">
                <ConfigTree
                  config={activeConfig.configData}
                  docs={activeConfig.docs}
                  onSelectProperty={handleSelectProperty}
                  onEditProperty={handleSelectProperty}
                  selectedPath={selectedPath}
                />
              </div>
            </div>

            {/* 右パネル: プロパティ詳細（直接編集） */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-col max-h-[calc(100vh-250px)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">プロパティ詳細</h2>
                {hasUnsavedChanges && (
                  <button
                    onClick={handleSaveProperty}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <SaveIcon className="w-4 h-4" />
                    保存
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {selectedPath && editingDoc ? (
                <div className="space-y-4">
                  {/* パス */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      パス
                    </label>
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded font-mono">
                      {selectedPath}
                    </div>
                  </div>

                  {/* 説明 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      説明
                    </label>
                    <textarea
                      value={editingDoc.description}
                      onChange={(e) => {
                        const updated = { ...editingDoc, description: e.target.value };
                        setEditingDoc(updated);
                        setHasUnsavedChanges(checkForChanges(updated, originalDoc));
                      }}
                      className="w-full border rounded p-2 min-h-[100px] text-sm"
                      placeholder="このプロパティの説明を入力してください"
                    />
                  </div>

                  {/* 備考 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      備考
                    </label>
                    <textarea
                      value={editingDoc.notes}
                      onChange={(e) => {
                        const updated = { ...editingDoc, notes: e.target.value };
                        setEditingDoc(updated);
                        setHasUnsavedChanges(checkForChanges(updated, originalDoc));
                      }}
                      className="w-full border rounded p-2 min-h-[80px] text-sm"
                      placeholder="追加のメモや注意事項"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-12">
                  プロパティを選択してください
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ファイルブラウザ */}
      <FileBrowser
        isOpen={isFileBrowserOpen}
        currentPath="."
        multiSelect={true}
        filterJsonOnly={true}
        onSelect={(filePaths) => {
          handleSelectConfigFiles(filePaths);
          setIsFileBrowserOpen(false);
        }}
        onClose={() => setIsFileBrowserOpen(false)}
      />

      {/* トースト通知 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
