'use client';

import { useState, useEffect } from 'react';
import { ConfigDocs, PropertyDoc, ExportSettings, DEFAULT_FIELDS } from '@/types';
import { ConfigTree } from '@/components/ConfigTree';
import { FileBrowser } from '@/components/FileBrowser';
import { ExportDialog } from '@/components/ExportDialog';
import { TagEditor } from '@/components/TagEditor';
import { FieldsEditor } from '@/components/FieldsEditor';
import { ToastContainer, ToastType } from '@/components/Toast';
import { FolderOpenIcon, XIcon, SaveIcon, DownloadIcon, FileTextIcon } from 'lucide-react';

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
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [rootPath, setRootPath] = useState<string>('.');

  // 編集中のプロパティドキュメント
  const [editingDoc, setEditingDoc] = useState<PropertyDoc | null>(null);
  const [originalDoc, setOriginalDoc] = useState<PropertyDoc | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // エクスポート設定
  const [exportSettings, setExportSettings] = useState<ExportSettings | undefined>();

  // 利用可能なタグ
  const [availableTags, setAvailableTags] = useState<string[]>(['required', 'nullable', 'string', 'number', 'boolean']);

  // プロジェクトのフィールド定義（デフォルト: { "説明": "" }）
  const [projectFields, setProjectFields] = useState<Record<string, string>>(DEFAULT_FIELDS);

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

    // タグの比較
    const currentTags = current.tags || [];
    const originalTags = original.tags || [];
    if (currentTags.length !== originalTags.length) return true;
    if (currentTags.some((tag, index) => tag !== originalTags[index])) return true;

    // フィールドの比較（値の変更のみ検出、フィールドの追加・削除は無視）
    const currentFields = current.fields || {};
    const originalFields = original.fields || {};
    // 両方に存在するキーの値を比較
    const allKeys = new Set([...Object.keys(currentFields), ...Object.keys(originalFields)]);
    for (const key of allKeys) {
      const currentValue = currentFields[key] || '';
      const originalValue = originalFields[key] || '';
      if (currentValue !== originalValue) return true;
    }

    return false;
  };

  const activeConfig = loadedConfigs[activeConfigIndex];

  // 同名ファイルを区別するための表示名を生成
  const getDisplayName = (filePath: string, allFilePaths: string[]): string => {
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
  };

  // 初期化時にメタデータから設定ファイルリストを読み込む
  useEffect(() => {
    const loadSavedConfigs = async () => {
      try {
        const response = await fetch('/api/project');
        const result = await response.json();

        if (result.success) {
          // ルートパスを設定
          setRootPath(result.data.rootPath);

          if (result.data.hasConfigDoc) {
            // メタデータを読み込む
            const metaResponse = await fetch('/api/config/metadata');
            const metaResult = await metaResponse.json();

            if (metaResult.success && metaResult.data?.configFiles) {
              // 保存されている設定ファイルを読み込む
              for (const configFile of metaResult.data.configFiles) {
                await loadConfigFile(configFile.filePath);
              }
            }

            // 利用可能なタグを読み込む
            if (metaResult.success && metaResult.data?.availableTags) {
              setAvailableTags(metaResult.data.availableTags);
            }

            // プロジェクトのフィールドを読み込む
            if (metaResult.success && metaResult.data?.fields) {
              setProjectFields(metaResult.data.fields);
            }
          }
        }

        // エクスポート設定を読み込む
        const exportResponse = await fetch('/api/export/settings');
        const exportResult = await exportResponse.json();
        if (exportResult.success) {
          setExportSettings(exportResult.data);
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

  // 絶対パスを相対パスに変換（Windows/Unix対応）
  const toRelativePath = (absolutePath: string, basePath: string): string => {
    // パスの正規化（バックスラッシュをスラッシュに統一）
    const normalizeSlash = (p: string) => p.replace(/\\/g, '/');
    const normAbsolute = normalizeSlash(absolutePath);
    const normBase = normalizeSlash(basePath);

    // 既に相対パスの場合はそのまま返す
    if (!normAbsolute.match(/^[a-zA-Z]:\//) && !normAbsolute.startsWith('/')) {
      return absolutePath;
    }

    // ベースパスで始まっている場合は相対パスに変換
    if (normAbsolute.startsWith(normBase)) {
      const relative = normAbsolute.substring(normBase.length);
      return relative.startsWith('/') ? relative.substring(1) : relative;
    }

    return absolutePath;
  };

  const handleSelectConfigFiles = async (filePaths: string[]) => {
    const newConfigs: LoadedConfig[] = [];

    for (const filePath of filePaths) {
      // 絶対パスを相対パスに変換
      const relativePath = toRelativePath(filePath, rootPath);

      // 既に読み込まれているか確認（相対パスで比較）
      if (loadedConfigs.some(c => c.filePath === relativePath)) {
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
            filePath: relativePath,  // 相対パスで保存
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

  // projectFieldsでフィルタリングしてPropertyDocを整形
  const normalizePropertyDoc = (doc: PropertyDoc): PropertyDoc => {
    const filteredFields: Record<string, string> = {};
    for (const key of Object.keys(projectFields)) {
      filteredFields[key] = doc.fields[key] || '';
    }
    return { ...doc, fields: filteredFields };
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
      // 既存ドキュメントを移行・フィルタリング
      const docCopy = normalizePropertyDoc({
        ...existingDoc,
        tags: existingDoc.tags || []
      });
      setEditingDoc(docCopy);
      setOriginalDoc(docCopy);
    } else {
      // 新規ドキュメント（プロジェクトのフィールドを適用）
      const newDoc: PropertyDoc = {
        path,
        tags: [],
        fields: { ...projectFields },
        modifiedAt: new Date().toISOString()
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
        modifiedAt: new Date().toISOString()
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

        // 自動エクスポートが有効な場合
        if (exportSettings?.autoExport) {
          await handleAutoExport();
        }
      } else {
        showToast('保存に失敗しました: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('保存中にエラーが発生しました', 'error');
    }
  };

  const handleAutoExport = async () => {
    if (!exportSettings) return;

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportSettings.format,
          fileName: exportSettings.fileName
        })
      });

      if (response.ok) {
        // エクスポート設定を更新
        const updatedSettings = {
          ...exportSettings,
          lastExportedAt: new Date().toISOString()
        };
        setExportSettings(updatedSettings);

        // 設定をファイルに保存
        await fetch('/api/export/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: updatedSettings })
        });
      }
    } catch (error) {
      console.error('Auto export failed:', error);
    }
  };

  const handleExport = async (settings: ExportSettings) => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: settings.format,
          fileName: settings.fileName
        })
      });

      const result = await response.json();
      if (result.success) {
        // エクスポート設定を更新
        const updatedSettings = {
          ...settings,
          lastExportedAt: new Date().toISOString()
        };
        setExportSettings(updatedSettings);

        // 設定をファイルに保存
        await fetch('/api/export/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: updatedSettings })
        });

        showToast(`エクスポートしました: ${result.outputPath}`);
      } else {
        showToast('エクスポートに失敗しました: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Export failed:', error);
      showToast('エクスポート中にエラーが発生しました', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="ConfigDoc"
              className="w-12 h-12 rounded-lg"
            />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ConfigDoc
              </h1>
              <p className="text-xs text-gray-500">Configuration Documentation Tool</p>
            </div>
          </div>
          <button
            onClick={() => setIsExportDialogOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200 transform"
            title="エクスポート"
          >
            <DownloadIcon className="w-5 h-5" />
            <span className="font-medium">エクスポート</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-6 py-8">
        {/* ファイル選択セクション */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 mb-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FolderOpenIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">設定ファイル</h2>
            </div>
            <button
              onClick={() => setIsFileBrowserOpen(true)}
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
                  onClick={() => {
                    setActiveConfigIndex(index);
                    setSelectedPath('');
                    setEditingDoc(null);
                    setHasUnsavedChanges(false);
                  }}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    activeConfigIndex === index
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-md'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    activeConfigIndex === index ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {getDisplayName(config.filePath, loadedConfigs.map(c => c.filePath))}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConfig(index);
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

        {/* ツリーと詳細パネル */}
        {activeConfig && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左パネル: JSON構造ツリー */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col max-h-[calc(100vh-190px)] hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">JSON構造</h2>
              </div>
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
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col max-h-[calc(100vh-190px)] hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <SaveIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">プロパティ詳細</h2>
              </div>

                {selectedPath && editingDoc ? (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* パス（上部固定） */}
                  <div className="flex-shrink-0 pb-4 border-b border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      パス
                    </label>
                    <div className="text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg font-mono border border-blue-200 shadow-sm">
                      {selectedPath}
                    </div>
                  </div>

                  {/* スクロール可能なフォーム部分 */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-6 min-h-0">
                  {/* タグ */}
                  <TagEditor
                    selectedTags={editingDoc.tags || []}
                    availableTags={availableTags}
                    onSelectedTagsChange={(tags) => {
                      const updated = { ...editingDoc, tags };
                      setEditingDoc(updated);
                      setHasUnsavedChanges(checkForChanges(updated, originalDoc));
                    }}
                    onAvailableTagsChange={async (tags) => {
                      // 削除されたタグを検出
                      const removedTags = availableTags.filter(tag => !tags.includes(tag));

                      setAvailableTags(tags);
                      // プロジェクト設定を更新（configFilePathsは送らない）
                      await fetch('/api/config/metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          availableTags: tags
                        })
                      });

                      // 削除されたタグを全プロパティから削除
                      if (removedTags.length > 0) {
                        for (const config of loadedConfigs) {
                          let hasChanges = false;
                          const updatedProperties = { ...config.docs.properties };

                          for (const [propPath, doc] of Object.entries(updatedProperties)) {
                            if (doc.tags && doc.tags.length > 0) {
                              const updatedTags = doc.tags.filter(tag => !removedTags.includes(tag));
                              if (updatedTags.length !== doc.tags.length) {
                                updatedProperties[propPath] = {
                                  ...doc,
                                  tags: updatedTags
                                };
                                hasChanges = true;
                              }
                            }
                          }

                          if (hasChanges) {
                            // 更新されたドキュメントを保存
                            await fetch('/api/config/save', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                configFilePath: config.filePath,
                                properties: updatedProperties
                              })
                            });

                            // ローカル状態を更新
                            setLoadedConfigs(prev => prev.map(c =>
                              c.filePath === config.filePath
                                ? { ...c, docs: { ...c.docs, properties: updatedProperties } }
                                : c
                            ));
                          }
                        }

                        // 現在編集中のドキュメントのタグも更新
                        if (editingDoc && editingDoc.tags) {
                          const updatedEditingTags = editingDoc.tags.filter(tag => !removedTags.includes(tag));
                          if (updatedEditingTags.length !== editingDoc.tags.length) {
                            const updated = { ...editingDoc, tags: updatedEditingTags };
                            setEditingDoc(updated);
                            if (originalDoc) {
                              const updatedOriginalTags = (originalDoc.tags || []).filter(tag => !removedTags.includes(tag));
                              setOriginalDoc({ ...originalDoc, tags: updatedOriginalTags });
                            }
                          }
                        }
                      }
                    }}
                  />

                  {/* フィールド */}
                  <FieldsEditor
                    fields={editingDoc.fields || {}}
                    projectFields={projectFields}
                    onFieldsChange={(fields) => {
                      const updated = { ...editingDoc, fields };
                      setEditingDoc(updated);
                      setHasUnsavedChanges(checkForChanges(updated, originalDoc));
                    }}
                    onUpdateProjectFields={async (fields) => {
                      // 削除されたフィールドを検出
                      const oldFieldKeys = Object.keys(projectFields);
                      const newFieldKeys = Object.keys(fields);
                      const removedFields = oldFieldKeys.filter(key => !newFieldKeys.includes(key));

                      // プロジェクト設定を自動更新
                      setProjectFields(fields);
                      await fetch('/api/config/metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          fields: fields
                        })
                      });

                      // 削除されたフィールドを全プロパティから削除
                      if (removedFields.length > 0) {
                        for (const config of loadedConfigs) {
                          let hasChanges = false;
                          const updatedProperties = { ...config.docs.properties };

                          for (const [propPath, doc] of Object.entries(updatedProperties)) {
                            if (doc.fields) {
                              const updatedFields = { ...doc.fields };
                              let fieldRemoved = false;

                              for (const removedField of removedFields) {
                                if (removedField in updatedFields) {
                                  delete updatedFields[removedField];
                                  fieldRemoved = true;
                                }
                              }

                              if (fieldRemoved) {
                                updatedProperties[propPath] = {
                                  ...doc,
                                  fields: updatedFields
                                };
                                hasChanges = true;
                              }
                            }
                          }

                          if (hasChanges) {
                            // 更新されたドキュメントを保存
                            await fetch('/api/config/save', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                configFilePath: config.filePath,
                                properties: updatedProperties
                              })
                            });

                            // ローカル状態を更新
                            setLoadedConfigs(prev => prev.map(c =>
                              c.filePath === config.filePath
                                ? { ...c, docs: { ...c.docs, properties: updatedProperties } }
                                : c
                            ));
                          }
                        }
                      }

                      // 現在編集中のドキュメントのoriginalDocを新しいフィールド構造に更新
                      // これによりフィールドの追加・削除が「変更」として検出されなくなる
                      if (originalDoc) {
                        const updatedOriginalFields: Record<string, string> = {};
                        for (const key of newFieldKeys) {
                          updatedOriginalFields[key] = originalDoc.fields?.[key] || '';
                        }
                        setOriginalDoc({ ...originalDoc, fields: updatedOriginalFields });
                      }

                      // editingDocも新しいフィールド構造に更新
                      if (editingDoc) {
                        const updatedEditingFields: Record<string, string> = {};
                        for (const key of newFieldKeys) {
                          updatedEditingFields[key] = editingDoc.fields?.[key] || '';
                        }
                        const updated = { ...editingDoc, fields: updatedEditingFields };
                        setEditingDoc(updated);

                        // 更新後のoriginalDocと比較して変更を再チェック
                        const updatedOriginal = originalDoc ? { ...originalDoc, fields: Object.fromEntries(newFieldKeys.map(key => [key, originalDoc.fields?.[key] || ''])) } : null;
                        setHasUnsavedChanges(checkForChanges(updated, updatedOriginal));
                      }
                    }}
                  />

                  </div>

                  {/* 保存ボタン（下部固定） */}
                  <div className="flex-shrink-0 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveProperty}
                      disabled={!hasUnsavedChanges}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-md transition-all duration-200 transform ${
                        hasUnsavedChanges
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg cursor-pointer'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <SaveIcon className="w-5 h-5" />
                      <span className="font-medium">保存</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                    <FileTextIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">プロパティを選択してください</p>
                  <p className="text-xs text-gray-500 mt-1">左側のツリーから項目を選択</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ファイルブラウザ */}
      <FileBrowser
        isOpen={isFileBrowserOpen}
        currentPath={rootPath}
        multiSelect={true}
        filterJsonOnly={true}
        onSelect={(filePaths) => {
          handleSelectConfigFiles(filePaths);
          setIsFileBrowserOpen(false);
        }}
        onClose={() => setIsFileBrowserOpen(false)}
      />

      {/* エクスポートダイアログ */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
        currentSettings={exportSettings}
        rootPath={rootPath}
      />

      {/* トースト通知 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
