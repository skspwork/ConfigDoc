'use client';

import { EditableListWrapper } from './EditableList';

interface FieldsEditorProps {
  fields: Record<string, string>;
  inheritedFields?: Record<string, string>;
  projectFields: Record<string, string>;
  onFieldsChange: (fields: Record<string, string>) => void;
  onUpdateProjectFields?: (fields: Record<string, string>, renamedMap?: Record<string, string>) => void;
}

export function FieldsEditor({
  fields,
  inheritedFields,
  projectFields,
  onFieldsChange,
  onUpdateProjectFields
}: FieldsEditorProps) {
  // フィールド名の一覧
  const fieldNames = Object.keys(projectFields);

  // フィールド一覧が変更されたとき
  const handleFieldNamesChange = (newNames: string[], renamedMap?: Record<string, string>) => {
    // リネームマップの逆引きを作成（新名 → 旧名）
    const reverseRenameMap: Record<string, string> = {};
    if (renamedMap) {
      for (const [oldName, newName] of Object.entries(renamedMap)) {
        reverseRenameMap[newName] = oldName;
      }
    }

    // 新しいフィールド構造を構築
    const newFields: Record<string, string> = {};
    for (const name of newNames) {
      // リネームされた場合は旧名で値を取得、そうでなければ現在の名前で取得
      const oldName = reverseRenameMap[name] || name;
      newFields[name] = fields[oldName] || '';
    }

    // フィールドを更新（ローカル状態）
    onFieldsChange(newFields);

    // プロジェクト全体に適用（renamedMapを渡して他のプロパティのフィールドも更新）
    if (onUpdateProjectFields) {
      const newProjectFields: Record<string, string> = {};
      for (const name of newNames) {
        newProjectFields[name] = '';
      }
      onUpdateProjectFields(newProjectFields, renamedMap);
    }
  };

  // フィールド値の変更（通常モード）
  const handleFieldValueChange = (label: string, value: string) => {
    onFieldsChange({
      ...fields,
      [label]: value
    });
  };

  return (
    <EditableListWrapper
      label="フィールド"
      items={fieldNames}
      onItemsChange={handleFieldNamesChange}
      editButtonTitle="フィールドを編集"
      editModeDescription="フィールドの追加・削除・名前変更"
      inputPlaceholder="フィールド名"
      newItemPlaceholder="新しいフィールド名を入力"
      deleteButtonTitle="フィールドを削除"
      addButtonTitle="フィールドを追加"
      duplicateErrorMessage="同じ名前のフィールドがあります"
    >
      {/* 通常モード（フィールド値の入力） */}
      <div className="space-y-3">
        {Object.keys(projectFields).map((label) => {
          const directValue = fields[label] || '';
          const inheritedValue = inheritedFields?.[label] || '';
          const hasInheritedValue = !directValue && !!inheritedValue;

          return (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {hasInheritedValue && (
                  <span className="ml-2 text-xs text-purple-500 font-normal">
                    (テンプレートから継承)
                  </span>
                )}
              </label>
              <textarea
                value={directValue}
                onChange={(e) => handleFieldValueChange(label, e.target.value)}
                placeholder={inheritedValue || `${label}を入力してください`}
                className={`w-full border-2 rounded-lg p-3 min-h-[80px] text-sm transition-all duration-200 shadow-sm hover:shadow-md ${
                  hasInheritedValue
                    ? 'border-purple-200 bg-purple-50/50 placeholder:text-purple-400'
                    : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200'
                }`}
              />
            </div>
          );
        })}
      </div>
    </EditableListWrapper>
  );
}
