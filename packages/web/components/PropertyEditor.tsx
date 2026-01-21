'use client';

import { SaveIcon, FileTextIcon } from 'lucide-react';
import { PropertyDoc } from '@/types';
import { TagEditor } from '@/components/TagEditor';
import { FieldsEditor } from '@/components/FieldsEditor';

interface PropertyEditorProps {
  selectedPath: string;
  editingDoc: PropertyDoc | null;
  hasUnsavedChanges: boolean;
  availableTags: string[];
  projectFields: Record<string, string>;
  onEditingDocChange: (doc: PropertyDoc) => void;
  onAvailableTagsChange: (tags: string[]) => void;
  onProjectFieldsChange: (fields: Record<string, string>) => void;
  onSave: () => void;
}

export function PropertyEditor({
  selectedPath,
  editingDoc,
  hasUnsavedChanges,
  availableTags,
  projectFields,
  onEditingDocChange,
  onAvailableTagsChange,
  onProjectFieldsChange,
  onSave
}: PropertyEditorProps) {
  return (
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
                onEditingDocChange({ ...editingDoc, tags });
              }}
              onAvailableTagsChange={onAvailableTagsChange}
            />

            {/* フィールド */}
            <FieldsEditor
              fields={editingDoc.fields || {}}
              projectFields={projectFields}
              onFieldsChange={(fields) => {
                onEditingDocChange({ ...editingDoc, fields });
              }}
              onUpdateProjectFields={onProjectFieldsChange}
            />
          </div>

          {/* 保存ボタン（下部固定） */}
          <div className="flex-shrink-0 pt-4 border-t border-gray-200">
            <button
              onClick={onSave}
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
  );
}
