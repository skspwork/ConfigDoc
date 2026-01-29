'use client';

import { SaveIcon, FileTextIcon, CopyIcon, ClipboardPasteIcon, Trash2Icon } from 'lucide-react';
import { PropertyDoc } from '@/types';
import { TagEditor } from '@/components/TagEditor';
import { FieldsEditor } from '@/components/FieldsEditor';

interface PropertyEditorProps {
  selectedPath: string;
  editingDoc: PropertyDoc | null;
  hasUnsavedChanges: boolean;
  availableTags: string[];
  projectFields: Record<string, string>;
  selectedNodeType?: 'object' | 'array' | 'string' | 'number' | 'boolean';
  isAssociativeArray?: boolean;
  isDescendantOfAssociativeArray?: boolean;
  inheritedTags?: string[];
  inheritedFields?: Record<string, string>;
  onEditingDocChange: (doc: PropertyDoc) => void;
  onAvailableTagsChange: (tags: string[], renamedMap?: Record<string, string>) => void;
  onProjectFieldsChange: (fields: Record<string, string>, renamedMap?: Record<string, string>) => void;
  onSave: () => void;
  onToggleAssociativeArray?: (path: string, isAssociative: boolean) => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onDelete: () => void;
  hasExistingDoc: boolean;
}

export function PropertyEditor({
  selectedPath,
  editingDoc,
  hasUnsavedChanges,
  availableTags,
  projectFields,
  selectedNodeType,
  isAssociativeArray = false,
  isDescendantOfAssociativeArray = false,
  inheritedTags,
  inheritedFields,
  onEditingDocChange,
  onAvailableTagsChange,
  onProjectFieldsChange,
  onSave,
  onToggleAssociativeArray,
  onCopy,
  onPaste,
  canPaste,
  onDelete,
  hasExistingDoc
}: PropertyEditorProps) {
  // パスが配列インデックスを含むか、または連想配列の子孫かどうかを判定
  const hasArrayIndex = /\[\d+\]/.test(selectedPath);
  // テンプレートオプションを表示するかどうか（配列要素または連想配列の子孫）
  const showTemplateOption = hasArrayIndex || isDescendantOfAssociativeArray;
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col max-h-[calc(100vh-190px)] hover:shadow-2xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <SaveIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">プロパティ詳細</h2>
        </div>
        {/* コピー・ペーストボタン（右上） */}
        {selectedPath && editingDoc && (
          <div className="flex items-center gap-1">
            <button
              onClick={onCopy}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="プロパティ詳細をコピー"
            >
              <CopyIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onPaste}
              disabled={!canPaste}
              className={`p-2 rounded-lg transition-colors ${
                canPaste
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="プロパティ詳細を貼り付け"
            >
              <ClipboardPasteIcon className="w-4 h-4" />
            </button>
          </div>
        )}
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
              inheritedTags={inheritedTags}
              availableTags={availableTags}
              onSelectedTagsChange={(tags) => {
                onEditingDocChange({ ...editingDoc, tags });
              }}
              onAvailableTagsChange={onAvailableTagsChange}
            />

            {/* フィールド */}
            <FieldsEditor
              fields={editingDoc.fields || {}}
              inheritedFields={inheritedFields}
              projectFields={projectFields}
              onFieldsChange={(fields) => {
                onEditingDocChange({ ...editingDoc, fields });
              }}
              onUpdateProjectFields={onProjectFieldsChange}
            />

            {/* テンプレート・連想配列オプション */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              {/* テンプレートオプション（配列要素または連想配列の子孫の場合に表示） */}
              {showTemplateOption && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <input
                    type="checkbox"
                    id="isTemplate"
                    checked={editingDoc.isTemplate || false}
                    onChange={(e) => onEditingDocChange({ ...editingDoc, isTemplate: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="isTemplate" className="text-sm text-purple-800 cursor-pointer">
                    <span className="font-medium">テンプレートとして保存</span>
                    <span className="block text-xs text-purple-600 mt-0.5">
                      同じ構造の全配列要素にこのドキュメントを適用します
                    </span>
                  </label>
                </div>
              )}

              {/* 連想配列オプション（オブジェクトタイプの場合のみ表示） */}
              {selectedNodeType === 'object' && onToggleAssociativeArray && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <input
                    type="checkbox"
                    id="isAssociativeArray"
                    checked={isAssociativeArray}
                    onChange={(e) => onToggleAssociativeArray(selectedPath, e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="isAssociativeArray" className="text-sm text-amber-800 cursor-pointer">
                    <span className="font-medium">連想配列として登録</span>
                    <span className="block text-xs text-amber-600 mt-0.5">
                      キー名を配列インデックスとして扱い、テンプレート展開の対象にします
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* ボタン（下部固定） */}
          <div className="flex-shrink-0 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {/* 削除ボタン */}
              <button
                onClick={onDelete}
                disabled={!hasExistingDoc}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                  hasExistingDoc
                    ? 'text-red-600 bg-white border border-red-300 hover:bg-red-50'
                    : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
                }`}
                title="プロパティ詳細を削除"
              >
                <Trash2Icon className="w-4 h-4" />
                削除
              </button>
              {/* 保存ボタン */}
              <button
                onClick={onSave}
                disabled={!hasUnsavedChanges}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg shadow-md transition-all duration-200 ${
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
  );
}
