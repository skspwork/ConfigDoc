'use client';

import { CheckIcon } from 'lucide-react';
import { EditableListWrapper } from './EditableList';

interface TagEditorProps {
  selectedTags: string[];
  inheritedTags?: string[];
  availableTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  onAvailableTagsChange: (tags: string[], renamedMap?: Record<string, string>) => void;
}

export function TagEditor({
  selectedTags,
  inheritedTags,
  availableTags,
  onSelectedTagsChange,
  onAvailableTagsChange
}: TagEditorProps) {
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  // 削除されたタグを選択から除外（リネームも考慮）
  const handleTagsChange = (newTags: string[], renamedMap?: Record<string, string>) => {
    // まずリネームを適用
    let updatedSelectedTags = selectedTags.map(tag => {
      if (renamedMap && renamedMap[tag]) {
        return renamedMap[tag];
      }
      return tag;
    });
    // 次に削除されたタグを除外
    updatedSelectedTags = updatedSelectedTags.filter(tag => newTags.includes(tag));
    if (JSON.stringify(updatedSelectedTags) !== JSON.stringify(selectedTags)) {
      onSelectedTagsChange(updatedSelectedTags);
    }
    // renamedMapを渡して他のプロパティのタグも更新できるようにする
    onAvailableTagsChange(newTags, renamedMap);
  };

  return (
    <EditableListWrapper
      label="タグ"
      items={availableTags}
      onItemsChange={handleTagsChange}
      editButtonTitle="タグを編集"
      editModeDescription="タグの追加・削除・名前変更"
      inputPlaceholder="タグ名"
      newItemPlaceholder="新しいタグ名を入力"
      deleteButtonTitle="タグを削除"
      addButtonTitle="タグを追加"
      duplicateErrorMessage="同じ名前のタグがあります"
    >
      {/* 通常モード（タグの選択） */}
      <div className="flex flex-wrap gap-2">
        {availableTags.length === 0 ? (
          <div className="text-sm text-gray-500">
            タグがありません。鉛筆アイコンをクリックして追加してください。
          </div>
        ) : (
          availableTags.map((tag) => {
            const isDirectlySelected = selectedTags.includes(tag);
            const isInherited = !isDirectlySelected && (inheritedTags?.includes(tag) || false);
            const isSelected = isDirectlySelected || isInherited;

            return (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                  isDirectlySelected
                    ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                    : isInherited
                    ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
                title={isInherited ? 'テンプレートから継承（クリックで直接選択に変更）' : undefined}
              >
                {isSelected && <CheckIcon className="w-3 h-3" />}
                <span>{tag}</span>
              </button>
            );
          })
        )}
      </div>
    </EditableListWrapper>
  );
}
