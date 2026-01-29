'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConfigDocs, PropertyDoc, ExportSettings, DEFAULT_FIELDS, AssociativeArrayMapping } from '@/types';
import { LoadedConfig } from '@/components/ConfigFileTabs';
import { ToastType } from '@/components/Toast';
import {
  sortTagsByOrder,
  reorderFields,
  detectTagChanges,
  detectFieldChanges
} from '@/lib/configManagerUtils';
import { getValueByPath, getTemplatePathForConcrete, normalizeToTemplatePath, findTemplateForPath, convertToWildcardBasePath } from '@/lib/templatePath';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// クリップボード用の型
interface PropertyClipboard {
  tags: string[];
  fields: Record<string, string>;
}

interface UseConfigManagerReturn {
  // 状態
  loadedConfigs: LoadedConfig[];
  activeConfigIndex: number;
  activeConfig: LoadedConfig | undefined;
  selectedPath: string;
  selectedNodeType: 'object' | 'array' | 'string' | 'number' | 'boolean' | undefined;
  editingDoc: PropertyDoc | null;
  originalDoc: PropertyDoc | null;
  hasUnsavedChanges: boolean;
  exportSettings: ExportSettings | undefined;
  availableTags: string[];
  projectFields: Record<string, string>;
  associativeArrays: AssociativeArrayMapping[];
  toasts: Toast[];
  rootPath: string;
  isInitialized: boolean;
  clipboard: PropertyClipboard | null;
  inheritedTags: string[];
  inheritedFields: Record<string, string>;

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
  handleAvailableTagsChange: (tags: string[], renamedMap?: Record<string, string>) => Promise<void>;
  handleProjectFieldsChange: (fields: Record<string, string>, renamedMap?: Record<string, string>) => Promise<void>;
  handleToggleAssociativeArray: (path: string, isAssociative: boolean) => Promise<void>;
  checkForChanges: (current: PropertyDoc | null, original: PropertyDoc | null) => boolean;
  resetSelection: () => void;
  isAssociativeArray: (path: string) => boolean;
  isDescendantOfAssociativeArray: (path: string) => boolean;
  handleCopyProperty: () => void;
  handlePasteProperty: () => void;
  handleDeleteProperty: () => Promise<void>;
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

  // 連想配列マッピング
  const [associativeArrays, setAssociativeArrays] = useState<AssociativeArrayMapping[]>([]);

  // 選択されたノードの型
  const [selectedNodeType, setSelectedNodeType] = useState<'object' | 'array' | 'string' | 'number' | 'boolean' | undefined>(undefined);

  // トースト通知
  const [toasts, setToasts] = useState<Toast[]>([]);

  // クリップボード（コピー＆ペースト用）
  const [clipboard, setClipboard] = useState<PropertyClipboard | null>(null);

  // テンプレートからの継承情報（プレースホルダー表示用）
  const [inheritedTags, setInheritedTags] = useState<string[]>([]);
  const [inheritedFields, setInheritedFields] = useState<Record<string, string>>({});

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

    // isTemplateの比較
    if ((current.isTemplate || false) !== (original.isTemplate || false)) return true;

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

            if (metaResult.success && metaResult.data?.associativeArrays) {
              setAssociativeArrays(metaResult.data.associativeArrays);
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

  // テンプレートのソースパスかどうかをチェック
  const findTemplateWithSourcePath = useCallback((path: string): PropertyDoc | undefined => {
    if (!activeConfig) return undefined;
    // すべてのテンプレートドキュメントをチェック
    for (const doc of Object.values(activeConfig.docs.properties)) {
      if (doc.isTemplate && doc.sourceTemplatePath === path) {
        return doc;
      }
    }
    return undefined;
  }, [activeConfig]);

  // プロパティを選択
  const handleSelectProperty = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('保存されていない変更があります。破棄しますか？')) {
        return;
      }
    }

    setSelectedPath(path);
    const existingDoc = activeConfig?.docs.properties[path];

    // ノードタイプを判定
    if (activeConfig?.configData) {
      const value = getValueByPath(activeConfig.configData, path);
      if (value === null || value === undefined) {
        setSelectedNodeType(undefined);
      } else if (Array.isArray(value)) {
        setSelectedNodeType('array');
      } else if (typeof value === 'object') {
        setSelectedNodeType('object');
      } else if (typeof value === 'string') {
        setSelectedNodeType('string');
      } else if (typeof value === 'number') {
        setSelectedNodeType('number');
      } else if (typeof value === 'boolean') {
        setSelectedNodeType('boolean');
      } else {
        setSelectedNodeType(undefined);
      }
    }

    // テンプレート元パスかチェック（直接ドキュメントの有無に関わらず）
    const templateFromSourcePath = findTemplateWithSourcePath(path);
    const isTemplateSource = !!templateFromSourcePath;

    // 継承用テンプレートを検索（直接ドキュメント以外のテンプレート）
    const foundInheritedTemplate = activeConfig?.configData
      ? findTemplateForPath(
          path,
          activeConfig.docs.properties as Record<string, PropertyDoc>,
          associativeArrays,
          activeConfig.configData
        )
      : undefined;

    // 継承情報を設定（テンプレート元パス以外で、継承テンプレートがある場合）
    if (foundInheritedTemplate && !isTemplateSource) {
      setInheritedTags(foundInheritedTemplate.tags || []);
      setInheritedFields(foundInheritedTemplate.fields || {});
    } else {
      setInheritedTags([]);
      setInheritedFields({});
    }

    if (existingDoc) {
      // 直接ドキュメントがある場合
      const directDoc = {
        ...existingDoc,
        tags: existingDoc.tags || [],
        // このパスがテンプレート元の場合はisTemplateをtrueに設定
        isTemplate: isTemplateSource ? true : existingDoc.isTemplate
      };

      // 継承値をマージせず、直接設定値のみを保持
      const docCopy = normalizePropertyDoc(directDoc);
      setEditingDoc(docCopy);
      setOriginalDoc(docCopy);
    } else {
      // 直接ドキュメントがない場合
      if (templateFromSourcePath) {
        // テンプレート元パスの場合、テンプレートの内容を読み込み、isTemplateをtrueに
        const docCopy = normalizePropertyDoc({
          ...templateFromSourcePath,
          path,
          tags: templateFromSourcePath.tags || [],
          isTemplate: true
        });
        setEditingDoc(docCopy);
        setOriginalDoc(docCopy);
      } else {
        // 継承テンプレートの有無に関わらず、空のドキュメントで初期化
        // 継承値はinheritedTags/inheritedFieldsに保持されているため、UI側でプレースホルダーとして表示
        const newDoc: PropertyDoc = {
          path,
          tags: [],
          fields: Object.fromEntries(Object.keys(projectFields).map(k => [k, ''])),
          modifiedAt: new Date().toISOString(),
          isTemplate: false
        };
        setEditingDoc(newDoc);
        setOriginalDoc(newDoc);
      }
    }
    setHasUnsavedChanges(false);
  }, [activeConfig, associativeArrays, findTemplateWithSourcePath, hasUnsavedChanges, normalizePropertyDoc, projectFields]);

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
          propertyDoc,
          associativeArrays,
          configData: activeConfig.configData
        })
      });

      const result = await response.json();
      if (result.success) {
        setLoadedConfigs(prev => prev.map((config, idx) => {
          if (idx !== activeConfigIndex) return config;

          const updatedProperties = { ...config.docs.properties };

          if (propertyDoc.isTemplate) {
            // テンプレートとして保存する場合、テンプレートパスでドキュメントを追加
            let templatePath: string;
            if (associativeArrays.length > 0 && config.configData) {
              templatePath = getTemplatePathForConcrete(selectedPath, associativeArrays, config.configData);
            } else {
              templatePath = normalizeToTemplatePath(selectedPath);
            }

            // テンプレートドキュメントを作成
            const templateDoc: PropertyDoc = {
              ...propertyDoc,
              path: templatePath,
              sourceTemplatePath: selectedPath
            };
            updatedProperties[templatePath] = templateDoc;

            // 直接パスのドキュメントは削除（古いデータが残らないように）
            delete updatedProperties[selectedPath];
          } else {
            // テンプレートのチェックを外した場合、関連するテンプレートドキュメントを削除
            for (const [docPath, doc] of Object.entries(updatedProperties)) {
              if (doc.isTemplate && doc.sourceTemplatePath === selectedPath) {
                delete updatedProperties[docPath];
                break;
              }
            }
            // 現在のドキュメントを更新
            updatedProperties[selectedPath] = propertyDoc;
          }

          return {
            ...config,
            docs: {
              ...config.docs,
              properties: updatedProperties
            }
          };
        }));
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

        // 複数ファイル出力の場合はフォルダパスを表示、単一ファイルの場合はファイルパスを表示
        const displayPath = result.outputPaths
          ? result.outputPaths[0]?.replace(/[/\\][^/\\]+$/, '') || settings.outputDir || '.'
          : result.outputPath;
        showToast(`エクスポートしました: ${displayPath}`);
      } else {
        showToast('エクスポートに失敗しました: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Export failed:', error);
      showToast('エクスポート中にエラーが発生しました', 'error');
    }
  }, [showToast]);

  // 利用可能なタグを更新
  const handleAvailableTagsChange = useCallback(async (tags: string[], renamedMap?: Record<string, string>) => {
    const removedTags = availableTags.filter(tag => !tags.includes(tag));
    const oldTagOrder = availableTags;
    const newTagOrder = tags;

    setAvailableTags(tags);
    await fetch('/api/config/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableTags: tags })
    });

    // タグの削除、順序変更、または名前変更がある場合、すべてのドキュメントを更新
    const hasRemovedTags = removedTags.length > 0;
    const hasOrderChanged = oldTagOrder.some((tag, idx) => tag !== newTagOrder[idx]) ||
                           oldTagOrder.length !== newTagOrder.length;
    const hasRenamedTags = renamedMap && Object.keys(renamedMap).length > 0;

    if (hasRemovedTags || hasOrderChanged || hasRenamedTags) {
      for (const config of loadedConfigs) {
        let hasChanges = false;
        const updatedProperties = { ...config.docs.properties };

        for (const [propPath, doc] of Object.entries(updatedProperties)) {
          if (doc.tags && doc.tags.length > 0) {
            // まずリネームを適用
            let mappedTags = doc.tags.map(tag => {
              if (renamedMap && renamedMap[tag]) {
                return renamedMap[tag];
              }
              return tag;
            });

            // 削除されたタグを除外
            const filteredTags = mappedTags.filter(tag => !removedTags.includes(tag));

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

      // 編集中のドキュメントはTagEditorのonSelectedTagsChangeで更新されるためここでは更新しない
      // （名前変更の場合、TagEditor側で正しいマッピングが行われる）
    }
  }, [availableTags, loadedConfigs]);

  // プロジェクトフィールドを更新
  const handleProjectFieldsChange = useCallback(async (fields: Record<string, string>, renamedMap?: Record<string, string>) => {
    const oldFieldKeys = Object.keys(projectFields);
    const newFieldKeys = Object.keys(fields);
    const removedFields = oldFieldKeys.filter(key => !newFieldKeys.includes(key));
    const hasRenamedFields = renamedMap && Object.keys(renamedMap).length > 0;

    setProjectFields(fields);
    await fetch('/api/config/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    // すべての設定ファイルのドキュメントを更新
    // フィールドの削除、順序変更、または名前変更に対応
    for (const config of loadedConfigs) {
      let hasChanges = false;
      const updatedProperties = { ...config.docs.properties };

      for (const [propPath, doc] of Object.entries(updatedProperties)) {
        if (doc.fields) {
          // 新しいフィールド定義の順序で再構築（renamedMapを渡す）
          const reorderedDocFields = reorderFields(doc.fields, newFieldKeys, renamedMap);

          // 順序が変わったか、削除されたフィールドがあるか、名前変更があるかチェック
          const oldKeys = Object.keys(doc.fields);
          const orderChanged = oldKeys.some((key, idx) => key !== newFieldKeys[idx]);
          const hasRemovedFields = removedFields.some(field => field in doc.fields);

          if (orderChanged || hasRemovedFields || hasRenamedFields || oldKeys.length !== newFieldKeys.length) {
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

    // 編集中のドキュメントはFieldsEditorのonFieldsChangeで更新されるためここでは更新しない
    // （名前変更の場合、FieldsEditor側で正しいマッピングが行われる）
  }, [loadedConfigs, projectFields]);

  // 選択状態をリセット
  const resetSelection = useCallback(() => {
    setSelectedPath('');
    setEditingDoc(null);
    setHasUnsavedChanges(false);
    setSelectedNodeType(undefined);
  }, []);

  // プロパティ詳細をコピー
  const handleCopyProperty = useCallback(() => {
    if (!editingDoc) return;
    setClipboard({
      tags: [...(editingDoc.tags || [])],
      fields: { ...(editingDoc.fields || {}) }
    });
    showToast('プロパティ詳細をコピーしました');
  }, [editingDoc, showToast]);

  // プロパティ詳細をペースト
  const handlePasteProperty = useCallback(() => {
    if (!clipboard || !editingDoc) return;

    // 利用可能なタグのみ保持
    const validTags = clipboard.tags.filter(tag => availableTags.includes(tag));

    // projectFieldsに定義されたフィールドのみ適用
    const validFields: Record<string, string> = {};
    for (const key of Object.keys(projectFields)) {
      validFields[key] = clipboard.fields[key] || '';
    }

    const pastedDoc: PropertyDoc = {
      ...editingDoc,
      tags: validTags,
      fields: validFields
    };

    setEditingDoc(pastedDoc);
    setHasUnsavedChanges(checkForChanges(pastedDoc, originalDoc));
    showToast('プロパティ詳細を貼り付けました');
  }, [clipboard, editingDoc, availableTags, projectFields, originalDoc, checkForChanges, showToast]);

  // プロパティ詳細を削除
  const handleDeleteProperty = useCallback(async () => {
    if (!editingDoc || !activeConfig || !selectedPath) return;

    // 確認ダイアログ
    if (!confirm('このプロパティの詳細を削除しますか？')) {
      return;
    }

    try {
      // APIで削除
      const response = await fetch('/api/config/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configFilePath: activeConfig.filePath,
          propertyPath: selectedPath
        })
      });

      const result = await response.json();
      if (result.success) {
        // ローカル状態を更新
        setLoadedConfigs(prev => prev.map((config, idx) => {
          if (idx !== activeConfigIndex) return config;

          const updatedProperties = { ...config.docs.properties };

          // 直接パスのドキュメントを削除
          delete updatedProperties[selectedPath];

          // このパスがsourceTemplatePathとして記録されているテンプレートも削除
          for (const [docPath, doc] of Object.entries(updatedProperties)) {
            if (doc.isTemplate && doc.sourceTemplatePath === selectedPath) {
              delete updatedProperties[docPath];
              break;
            }
          }

          return {
            ...config,
            docs: {
              ...config.docs,
              properties: updatedProperties
            }
          };
        }));

        // 編集状態をリセット
        const newDoc: PropertyDoc = {
          path: selectedPath,
          tags: [],
          fields: { ...projectFields },
          modifiedAt: new Date().toISOString()
        };
        setEditingDoc(newDoc);
        setOriginalDoc(newDoc);
        setHasUnsavedChanges(false);

        showToast('プロパティ詳細を削除しました');

        if (exportSettings?.autoExport) {
          await handleAutoExport();
        }
      } else {
        showToast('削除に失敗しました: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast('削除中にエラーが発生しました', 'error');
    }
  }, [activeConfig, activeConfigIndex, editingDoc, exportSettings?.autoExport, handleAutoExport, projectFields, selectedPath, showToast]);

  // 連想配列かどうかをチェック
  // ワイルドカード付きbasePathにも対応
  const isAssociativeArray = useCallback((path: string): boolean => {
    // 直接一致をチェック
    if (associativeArrays.some(mapping => mapping.basePath === path)) {
      return true;
    }

    // ワイルドカード化されたパスでチェック
    const wildcardedPath = convertToWildcardBasePath(path, associativeArrays, activeConfig?.configData);
    if (wildcardedPath !== path && associativeArrays.some(mapping => mapping.basePath === wildcardedPath)) {
      return true;
    }

    // ワイルドカードマッピングとのマッチをチェック
    return associativeArrays.some(mapping => {
      if (!mapping.basePath.includes('[*]')) return false;

      // ワイルドカードパスを正規表現に変換してマッチング
      const regexPattern = mapping.basePath
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\[\\\*\\\]/g, ':[^:]+');

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    });
  }, [associativeArrays, activeConfig?.configData]);

  // 連想配列の子孫パスかどうかをチェック
  const isDescendantOfAssociativeArray = useCallback((path: string): boolean => {
    return associativeArrays.some(mapping =>
      path.startsWith(mapping.basePath + ':')
    );
  }, [associativeArrays]);

  // 連想配列の登録/解除
  const handleToggleAssociativeArray = useCallback(async (path: string, isAssociative: boolean) => {
    let newMappings: AssociativeArrayMapping[];

    if (isAssociative) {
      // 親の連想配列キーをワイルドカードに変換したbasePathを生成
      const wildcardedBasePath = convertToWildcardBasePath(
        path,
        associativeArrays,
        activeConfig?.configData
      );

      // 追加
      newMappings = [
        ...associativeArrays,
        {
          basePath: wildcardedBasePath,
          createdAt: new Date().toISOString()
        }
      ];
    } else {
      // 削除 - パスまたはワイルドカード化されたパスでマッチング
      const wildcardedBasePath = convertToWildcardBasePath(
        path,
        associativeArrays,
        activeConfig?.configData
      );

      // このパスを親として持つ子孫のワイルドカードマッピングも削除
      // 例: "AppSettings:Fields" を削除 → "AppSettings:Fields[*]:Contents:Map" も削除
      const pathWithWildcard = path + '[*]';

      newMappings = associativeArrays.filter(mapping => {
        // 直接一致は削除
        if (mapping.basePath === path || mapping.basePath === wildcardedBasePath) {
          return false;
        }

        // このパスのワイルドカード形式で始まる子孫マッピングも削除
        // 例: mapping.basePath = "AppSettings:Fields[*]:Contents:Map"
        //     pathWithWildcard = "AppSettings:Fields[*]"
        if (mapping.basePath.startsWith(pathWithWildcard + ':') || mapping.basePath.startsWith(pathWithWildcard)) {
          return false;
        }

        return true;
      });
    }

    setAssociativeArrays(newMappings);

    // APIに保存
    try {
      await fetch('/api/config/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associativeArrays: newMappings })
      });
      showToast(isAssociative ? '連想配列として登録しました' : '連想配列登録を解除しました');
    } catch (error) {
      console.error('Failed to save associative array mapping:', error);
      showToast('連想配列設定の保存に失敗しました', 'error');
    }
  }, [associativeArrays, activeConfig?.configData, showToast]);

  return {
    loadedConfigs,
    activeConfigIndex,
    activeConfig,
    selectedPath,
    selectedNodeType,
    editingDoc,
    originalDoc,
    hasUnsavedChanges,
    exportSettings,
    availableTags,
    projectFields,
    associativeArrays,
    toasts,
    rootPath,
    isInitialized,
    inheritedTags,
    inheritedFields,

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
    handleToggleAssociativeArray,
    checkForChanges,
    resetSelection,
    isAssociativeArray,
    isDescendantOfAssociativeArray,
    clipboard,
    handleCopyProperty,
    handlePasteProperty,
    handleDeleteProperty
  };
}
