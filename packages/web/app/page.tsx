'use client';

import { useState } from 'react';
import { FileTextIcon } from 'lucide-react';
import { Header } from '@/components/Header';
import { ConfigFileTabs } from '@/components/ConfigFileTabs';
import { PropertyEditor } from '@/components/PropertyEditor';
import { ConfigTree } from '@/components/ConfigTree';
import { FileBrowser } from '@/components/FileBrowser';
import { ExportDialog } from '@/components/ExportDialog';
import { ToastContainer } from '@/components/Toast';
import { useConfigManager } from '@/hooks/useConfigManager';

export default function Home() {
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const {
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
    inheritedTags,
    inheritedFields,

    setActiveConfigIndex,
    setEditingDoc,
    setHasUnsavedChanges,
    removeToast,
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
  } = useConfigManager();

  // 選択中のパスに既存のドキュメントがあるかどうか
  const hasExistingDoc = !!(selectedPath && activeConfig?.docs.properties[selectedPath]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* ヘッダー */}
      <Header onExportClick={() => setIsExportDialogOpen(true)} />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-6 py-8">
        {/* ファイル選択セクション */}
        <ConfigFileTabs
          loadedConfigs={loadedConfigs}
          activeConfigIndex={activeConfigIndex}
          onTabClick={(index) => {
            setActiveConfigIndex(index);
            resetSelection();
          }}
          onRemoveConfig={handleRemoveConfig}
          onAddFileClick={() => setIsFileBrowserOpen(true)}
          onReorder={handleReorderConfigs}
        />

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
                  associativeArrays={associativeArrays}
                />
              </div>
            </div>

            {/* 右パネル: プロパティ詳細 */}
            <PropertyEditor
              selectedPath={selectedPath}
              editingDoc={editingDoc}
              hasUnsavedChanges={hasUnsavedChanges}
              availableTags={availableTags}
              projectFields={projectFields}
              selectedNodeType={selectedNodeType}
              isAssociativeArray={isAssociativeArray(selectedPath)}
              isDescendantOfAssociativeArray={isDescendantOfAssociativeArray(selectedPath)}
              inheritedTags={inheritedTags}
              inheritedFields={inheritedFields}
              onEditingDocChange={(doc) => {
                setEditingDoc(doc);
                setHasUnsavedChanges(checkForChanges(doc, originalDoc));
              }}
              onAvailableTagsChange={handleAvailableTagsChange}
              onProjectFieldsChange={handleProjectFieldsChange}
              onSave={handleSaveProperty}
              onToggleAssociativeArray={handleToggleAssociativeArray}
              onCopy={handleCopyProperty}
              onPaste={handlePasteProperty}
              canPaste={clipboard !== null}
              onDelete={handleDeleteProperty}
              hasExistingDoc={hasExistingDoc}
            />
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
