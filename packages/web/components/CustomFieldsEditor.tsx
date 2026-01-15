'use client';

import { useState, useEffect } from 'react';
import { PencilIcon, PlusIcon, XIcon, SaveIcon } from 'lucide-react';

interface CustomFieldsEditorProps {
  customFields: Record<string, string>;
  projectCustomFields: Record<string, string>;
  onCustomFieldsChange: (fields: Record<string, string>) => void;
  onUpdateProjectCustomFields?: (fields: Record<string, string>) => void;
}

interface EditingField {
  originalLabel: string;
  newLabel: string;
  isNew: boolean;
}

export function CustomFieldsEditor({
  customFields,
  projectCustomFields,
  onCustomFieldsChange,
  onUpdateProjectCustomFields
}: CustomFieldsEditorProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFields, setEditingFields] = useState<EditingField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  // 編集モードに入る際、現在のフィールドをコピー
  const enterEditMode = () => {
    const fields = Object.keys(customFields).map(label => ({
      originalLabel: label,
      newLabel: label,
      isNew: false
    }));
    setEditingFields(fields);
    setIsEditMode(true);
    setNewFieldLabel('');
  };

  // 編集モードをキャンセル
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditingFields([]);
    setNewFieldLabel('');
  };

  // フィールドを追加（編集モード内）
  const handleAddField = () => {
    const trimmedLabel = newFieldLabel.trim();
    if (trimmedLabel && !editingFields.some(f => f.newLabel === trimmedLabel)) {
      setEditingFields([...editingFields, {
        originalLabel: '',
        newLabel: trimmedLabel,
        isNew: true
      }]);
      setNewFieldLabel('');
    }
  };

  // フィールドを削除（編集モード内）
  const handleRemoveField = (index: number) => {
    setEditingFields(editingFields.filter((_, i) => i !== index));
  };

  // フィールド名を変更（編集モード内）
  const handleLabelChange = (index: number, newLabel: string) => {
    setEditingFields(editingFields.map((field, i) =>
      i === index ? { ...field, newLabel } : field
    ));
  };

  // 保存処理
  const handleSave = () => {
    // 新しいフィールド構造を構築
    const newFields: Record<string, string> = {};

    for (const field of editingFields) {
      const trimmedLabel = field.newLabel.trim();
      if (!trimmedLabel) continue;

      if (field.isNew) {
        // 新規フィールド
        newFields[trimmedLabel] = '';
      } else if (field.originalLabel !== trimmedLabel) {
        // 名前変更されたフィールド - 元の値を引き継ぐ
        newFields[trimmedLabel] = customFields[field.originalLabel] || '';
      } else {
        // 変更なし
        newFields[trimmedLabel] = customFields[field.originalLabel] || '';
      }
    }

    // 入力中のフィールドがあれば追加
    const pendingLabel = newFieldLabel.trim();
    if (pendingLabel && !newFields[pendingLabel]) {
      newFields[pendingLabel] = '';
    }

    // カスタムフィールドを更新（ローカル状態）
    onCustomFieldsChange(newFields);

    // プロジェクト全体に適用
    if (onUpdateProjectCustomFields) {
      onUpdateProjectCustomFields(newFields);
    }

    setIsEditMode(false);
    setEditingFields([]);
    setNewFieldLabel('');
  };

  // フィールド値の変更（通常モード）
  const handleFieldValueChange = (label: string, value: string) => {
    onCustomFieldsChange({
      ...customFields,
      [label]: value
    });
  };

  const handleKeyDownForField = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddField();
    }
  };

  // バリデーション: 重複チェック
  const hasDuplicateLabels = () => {
    const labels = editingFields.map(f => f.newLabel.trim()).filter(Boolean);
    return new Set(labels).size !== labels.length;
  };

  // バリデーション: 空のラベルチェック
  const hasEmptyLabels = () => {
    return editingFields.some(f => !f.newLabel.trim());
  };

  const canSave = !hasDuplicateLabels() && !hasEmptyLabels();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700">
          カスタムフィールド
        </label>
        {!isEditMode && (
          <button
            onClick={enterEditMode}
            className="text-gray-500 hover:text-blue-600 transition-colors p-1"
            title="カスタムフィールドを編集"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditMode ? (
        // 編集モード
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="text-xs font-medium text-blue-700 mb-2">
            フィールドの追加・削除・名前変更
          </div>

          {/* 既存フィールドの編集 */}
          <div className="space-y-2">
            {editingFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.newLabel}
                  onChange={(e) => handleLabelChange(index, e.target.value)}
                  placeholder="フィールド名"
                  className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 transition-all duration-200 ${
                    !field.newLabel.trim()
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
                  }`}
                />
                <button
                  onClick={() => handleRemoveField(index)}
                  className="text-gray-400 hover:text-red-600 transition-colors p-2"
                  title="フィールドを削除"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* 新規フィールド追加 */}
          <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              onKeyDown={handleKeyDownForField}
              placeholder="新しいフィールド名を入力"
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
            />
            <button
              onClick={handleAddField}
              disabled={!newFieldLabel.trim() || editingFields.some(f => f.newLabel.trim() === newFieldLabel.trim())}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="フィールドを追加"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          {/* エラーメッセージ */}
          {hasDuplicateLabels() && (
            <div className="text-xs text-red-600 mt-2">
              同じ名前のフィールドがあります
            </div>
          )}

          {/* 保存・キャンセルボタン */}
          <div className="flex items-center gap-2 pt-3 border-t border-blue-200">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              <SaveIcon className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={cancelEditMode}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        // 通常モード（フィールド値の入力）
        <div className="space-y-3">
          {Object.keys(customFields).length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
              カスタムフィールドがありません。
              <button
                onClick={enterEditMode}
                className="text-blue-600 hover:text-blue-700 ml-1"
              >
                追加する
              </button>
            </div>
          ) : (
            Object.entries(customFields).map(([label, value]) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <textarea
                  value={value}
                  onChange={(e) => handleFieldValueChange(label, e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 min-h-[80px] text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder={`${label}を入力してください`}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
