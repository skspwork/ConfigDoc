'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConfigDocs, PropertyDoc, ExportSettings, DEFAULT_FIELDS } from '@/types';
import { LoadedConfig } from '@/components/ConfigFileTabs';
import { ToastType } from '@/components/Toast';
import {
  sortTagsByOrder,
  reorderFields,
  detectTagChanges,
  detectFieldChanges
} from '@/lib/configManagerUtils';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UseConfigManagerReturn {
  // 状態
  loadedConfigs: LoadedConfig[];
  activeConfigIndex: number;
  activeConfig: LoadedConfig | undefined;
  selectedPath: string;
  editingDoc: PropertyDoc | null;
  originalDoc: PropertyDoc | null;
  hasUnsavedChanges: boolean;
  exportSettings: ExportSettings | undefined;
  availableTags: string[];
  projectFields: Record<string, string>;
  toasts: Toast[];
  rootPath: string;
  isInitialized: boolean;

  // アクション
  setActiveConfigIndex: (index: number) => void;
  setSelectedPath: (path: string) => void;
  setEditingDoc: (doc: PropertyDoc | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  loadConfigFile: (filePath: string) => Promise<void>;
  handleSelectConfigFiles: (filePaths: string[]) => Promise<void>;
  handleRemoveConfig: (index: number) => Promise<void>;
  handleReorderConfigs: (newConfigs: LoadedConfig[], newActiveIndex: number) => void;
  handleSelectProperty: (path: string) => void;
  handleSaveProperty: () => Promise<void>;
  handleExport: (settings: ExportSettings) => Promise<void>;
  handleAvailableTagsChange: (tags: string[]) => Promise<void>;
  handleProjectFieldsChange: (fields: Record<string, string>) => Promise<void>;
  checkForChanges: (current: PropertyDoc | null, original: PropertyDoc | null) => boolean;
  resetSelection: () => void;
}

export function useConfigManager(): UseConfigManagerReturn {
  const [loadedConfigs, setLoadedConfigs] = useState<LoadedConfig[]>([]);
  const [activeConfigIndex, setActiveConfigIndex] = useState<number>(0);
  const [selectedPath, setSelectedPath] = useState<string>('');
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

  // プロジェクトのフィールド定義
  const [projectFields, setProjectFields] = useState<Record<string, string>>(DEFAULT_FIELDS);

  // トースト通知
  const [toasts, setToasts] = useState<Toast[]>([]);

  const activeConfig = loadedConfigs[activeConfigIndex];

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 差分チェック関数
  const checkForChanges = useCallback((current: PropertyDoc | null, original: PropertyDoc | null): boolean => {
    if (!current || !original) return false;

    // タグの比較
    const currentTags = current.tags || [];
    const originalTags = original.tags || [];
    if (detectTagChanges(originalTags, currentTags)) return true;

    // フィールドの比較
    const currentFields = current.fields || {};
    const originalFields = original.fields || {};
    if (detectFieldChanges(originalFields, currentFields)) return true;

    return false;
  }, []);

  // 絶対パスを相対パスに変換
  const toRelativePath = useCallback((absolutePath: string, basePath: string): string => {
    const normalizeSlash = (p: string) => p.replace(/\\/g, '/');
    const normAbsolute = normalizeSlash(absolutePath);
    const normBase = normalizeSlash(basePath);

    if (!normAbsolute.match(/^[a-zA-Z]:\//) && !normAbsolute.startsWith('/')) {
      return absolutePath;
    }

    if (normAbsolute.startsWith(normBase)) {
      const relative = normAbsolute.substring(normBase.length);
      return relative.startsWith('/') ? relative.substring(1) : relative;
    }

    return absolutePath;
  }, []);

  // projectFieldsでフィルタリングしてPropertyDocを整形
  const normalizePropertyDoc = useCallback((doc: PropertyDoc): PropertyDoc => {
    const filteredFields: Record<string, string> = {};
    for (const key of Object.keys(projectFields)) {
      filteredFields[key] = doc.fields[key] || '';
    }
    return { ...doc, fields: filteredFields };
  }, [projectFields]);

  // 設定ファイルを読み込む
  const loadConfigFile = useCallback(async (filePath: string) => {
    try {
      const response = await fetch('/api/config/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });

      const result = await response.json();
      if (result.success) {
        setLoadedConfigs(prev => {
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
  }, []);

  // メタデータを更新
  const updateMetadata = useCallback(async (configFilePaths: string[]) => {
    try {
      const response = await fetch('/api/config/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configFilePaths })
      });

      const result = await response.json();

      if (result.deletedDocsFiles && result.deletedDocsFiles.length > 0) {
        showToast(
          `${result.deletedDocsFiles.length}件のドキュメントファイルを削除しました`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  }, [showToast]);

  // 自動エクスポート
  const handleAutoExport = useCallback(async () => {
    if (!exportSettings) return;

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportSettings.format,
          fileName: exportSettings.fileName,
          outputDir: exportSettings.outputDir
        })
      });

      if (response.ok) {
        const updatedSettings = {
          ...exportSettings,
          lastExportedAt: new Date().toISOString()
        };
        setExportSettings(updatedSettings);

        await fetch('/api/export/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: updatedSettings })
        });
      }
    } catch (error) {
      console.error('Auto export failed:', error);
    }
  }, [exportSettings]);

  // 初期化
  useEffect(() => {
    const loadSavedConfigs = async () => {
      try {
        const response = await fetch('/api/project');
        const result = await response.json();

        if (result.success) {
          setRootPath(result.data.rootPath);

          if (result.data.hasConfigDoc) {
            const metaResponse = await fetch('/api/config/metadata');
            const metaResult = await metaResponse.json();

            if (metaResult.success && metaResult.data?.configFiles) {
              for (const configFile of metaResult.data.configFiles) {
                await loadConfigFile(configFile.filePath);
              }
            }

            if (metaResult.success && metaResult.data?.availableTags) {
              setAvailableTags(metaResult.data.availableTags);
            }

            if (metaResult.success && metaResult.data?.fields) {
              setProjectFields(metaResult.data.fields);
            }
          }
        }

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
  }, [loadConfigFile]);

  // 設定ファイルを選択
  const handleSelectConfigFiles = useCallback(async (filePaths: string[]) => {
    const newConfigs: LoadedConfig[] = [];

    for (const filePath of filePaths) {
      const relativePath = toRelativePath(filePath, rootPath);

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
            filePath: relativePath,
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
        updateMetadata(updated.map(c => c.filePath));
        return updated;
      });
    }
  }, [loadedConfigs, rootPath, showToast, toRelativePath, updateMetadata]);

  // 設定ファイルを削除
  const handleRemoveConfig = useCallback(async (index: number) => {
    const configToRemove = loadedConfigs[index];

    if (configToRemove.docs && Object.keys(configToRemove.docs.properties).length > 0) {
      if (!confirm('既に説明文が設定されていますが、削除してよろしいですか？')) {
        return;
      }
    }

    setLoadedConfigs(prev => {
      const updated = prev.filter((_, i) => i !== index);
      updateMetadata(updated.map(c => c.filePath));
      return updated;
    });
    if (activeConfigIndex >= index && activeConfigIndex > 0) {
      setActiveConfigIndex(activeConfigIndex - 1);
    }
    setSelectedPath('');
    setEditingDoc(null);
    setHasUnsavedChanges(false);
  }, [activeConfigIndex, loadedConfigs, updateMetadata]);

  // タブの並び替え
  const handleReorderConfigs = useCallback((newConfigs: LoadedConfig[], newActiveIndex: number) => {
    setLoadedConfigs(newConfigs);
    setActiveConfigIndex(newActiveIndex);
    updateMetadata(newConfigs.map(c => c.filePath));
  }, [updateMetadata]);

  // プロパティを選択
  const handleSelectProperty = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('保存されていない変更があります。破棄しますか？')) {
        return;
      }
    }

    setSelectedPath(path);
    const existingDoc = activeConfig?.docs.properties[path];

    if (existingDoc) {
      const docCopy = normalizePropertyDoc({
        ...existingDoc,
        tags: existingDoc.tags || []
      });
      setEditingDoc(docCopy);
      setOriginalDoc(docCopy);
    } else {
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
  }, [activeConfig, hasUnsavedChanges, normalizePropertyDoc, projectFields]);

  // プロパティを保存
  const handleSaveProperty = useCallback(async () => {
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
  }, [activeConfig, activeConfigIndex, editingDoc, exportSettings?.autoExport, handleAutoExport, selectedPath, showToast]);

  // エクスポート
  const handleExport = useCallback(async (settings: ExportSettings) => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: settings.format,
          fileName: settings.fileName,
          outputDir: settings.outputDir
        })
      });

      const result = await response.json();
      if (result.success) {
        const updatedSettings = {
          ...settings,
          lastExportedAt: new Date().toISOString()
        };
        setExportSettings(updatedSettings);

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
  }, [showToast]);

  // 利用可能なタグを更新
  const handleAvailableTagsChange = useCallback(async (tags: string[]) => {
    const removedTags = availableTags.filter(tag => !tags.includes(tag));
    const oldTagOrder = availableTags;
    const newTagOrder = tags;

    setAvailableTags(tags);
    await fetch('/api/config/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableTags: tags })
    });

    // タグの削除または順序変更がある場合、すべてのドキュメントを更新
    const hasRemovedTags = removedTags.length > 0;
    const hasOrderChanged = oldTagOrder.some((tag, idx) => tag !== newTagOrder[idx]) ||
                           oldTagOrder.length !== newTagOrder.length;

    if (hasRemovedTags || hasOrderChanged) {
      for (const config of loadedConfigs) {
        let hasChanges = false;
        const updatedProperties = { ...config.docs.properties };

        for (const [propPath, doc] of Object.entries(updatedProperties)) {
          if (doc.tags && doc.tags.length > 0) {
            // 削除されたタグを除外
            const filteredTags = doc.tags.filter(tag => !removedTags.includes(tag));

            // availableTagsの順序でソート
            const updatedTags = sortTagsByOrder(filteredTags, newTagOrder);

            // タグの内容または順序が変わったかチェック
            const tagsChanged = detectTagChanges(doc.tags, updatedTags);

            if (tagsChanged) {
              updatedProperties[propPath] = { ...doc, tags: updatedTags };
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          await fetch('/api/config/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              configFilePath: config.filePath,
              properties: updatedProperties
            })
          });

          setLoadedConfigs(prev => prev.map(c =>
            c.filePath === config.filePath
              ? { ...c, docs: { ...c.docs, properties: updatedProperties } }
              : c
          ));
        }
      }

      // 編集中のドキュメントも更新
      if (editingDoc && editingDoc.tags && editingDoc.tags.length > 0) {
        const filteredEditingTags = editingDoc.tags.filter(tag => !removedTags.includes(tag));
        const updatedEditingTags = sortTagsByOrder(filteredEditingTags, newTagOrder);

        const tagsChanged = detectTagChanges(editingDoc.tags, updatedEditingTags);

        if (tagsChanged) {
          const updated = { ...editingDoc, tags: updatedEditingTags };
          setEditingDoc(updated);

          if (originalDoc && originalDoc.tags) {
            const filteredOriginalTags = originalDoc.tags.filter(tag => !removedTags.includes(tag));
            const updatedOriginalTags = sortTagsByOrder(filteredOriginalTags, newTagOrder);
            setOriginalDoc({ ...originalDoc, tags: updatedOriginalTags });
          }
        }
      }
    }
  }, [availableTags, editingDoc, loadedConfigs, originalDoc]);

  // プロジェクトフィールドを更新
  const handleProjectFieldsChange = useCallback(async (fields: Record<string, string>) => {
    const oldFieldKeys = Object.keys(projectFields);
    const newFieldKeys = Object.keys(fields);
    const removedFields = oldFieldKeys.filter(key => !newFieldKeys.includes(key));

    setProjectFields(fields);
    await fetch('/api/config/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    // すべての設定ファイルのドキュメントを更新
    // フィールドの削除または順序変更に対応
    for (const config of loadedConfigs) {
      let hasChanges = false;
      const updatedProperties = { ...config.docs.properties };

      for (const [propPath, doc] of Object.entries(updatedProperties)) {
        if (doc.fields) {
          // 新しいフィールド定義の順序で再構築
          const reorderedDocFields = reorderFields(doc.fields, newFieldKeys);

          // 順序が変わったか、削除されたフィールドがあるかチェック
          const oldKeys = Object.keys(doc.fields);
          const orderChanged = oldKeys.some((key, idx) => key !== newFieldKeys[idx]);
          const hasRemovedFields = removedFields.some(field => field in doc.fields);

          if (orderChanged || hasRemovedFields || oldKeys.length !== newFieldKeys.length) {
            updatedProperties[propPath] = { ...doc, fields: reorderedDocFields };
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        await fetch('/api/config/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configFilePath: config.filePath,
            properties: updatedProperties
          })
        });

        setLoadedConfigs(prev => prev.map(c =>
          c.filePath === config.filePath
            ? { ...c, docs: { ...c.docs, properties: updatedProperties } }
            : c
        ));
      }
    }

    if (originalDoc) {
      const updatedOriginalFields: Record<string, string> = {};
      for (const key of newFieldKeys) {
        updatedOriginalFields[key] = originalDoc.fields?.[key] || '';
      }
      setOriginalDoc({ ...originalDoc, fields: updatedOriginalFields });
    }

    if (editingDoc) {
      const updatedEditingFields: Record<string, string> = {};
      for (const key of newFieldKeys) {
        updatedEditingFields[key] = editingDoc.fields?.[key] || '';
      }
      const updated = { ...editingDoc, fields: updatedEditingFields };
      setEditingDoc(updated);

      const updatedOriginal = originalDoc
        ? { ...originalDoc, fields: Object.fromEntries(newFieldKeys.map(key => [key, originalDoc.fields?.[key] || ''])) }
        : null;
      setHasUnsavedChanges(checkForChanges(updated, updatedOriginal));
    }
  }, [checkForChanges, editingDoc, loadedConfigs, originalDoc, projectFields]);

  // 選択状態をリセット
  const resetSelection = useCallback(() => {
    setSelectedPath('');
    setEditingDoc(null);
    setHasUnsavedChanges(false);
  }, []);

  return {
    loadedConfigs,
    activeConfigIndex,
    activeConfig,
    selectedPath,
    editingDoc,
    originalDoc,
    hasUnsavedChanges,
    exportSettings,
    availableTags,
    projectFields,
    toasts,
    rootPath,
    isInitialized,

    setActiveConfigIndex,
    setSelectedPath,
    setEditingDoc,
    setHasUnsavedChanges,
    showToast,
    removeToast,
    loadConfigFile,
    handleSelectConfigFiles,
    handleRemoveConfig,
    handleReorderConfigs,
    handleSelectProperty,
    handleSaveProperty,
    handleExport,
    handleAvailableTagsChange,
    handleProjectFieldsChange,
    checkForChanges,
    resetSelection
  };
}
