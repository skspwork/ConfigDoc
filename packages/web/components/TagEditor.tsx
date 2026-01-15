'use client';

import { useState } from 'react';
import { XIcon, PlusIcon, PencilIcon, CheckIcon, SaveIcon } from 'lucide-react';

interface TagEditorProps {
  selectedTags: string[];
  availableTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  onAvailableTagsChange: (tags: string[]) => void;
}

export function TagEditor({
  selectedTags,
  availableTags,
  onSelectedTagsChange,
  onAvailableTagsChange
}: TagEditorProps) {
  const [isEditingAvailable, setIsEditingAvailable] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  // 編集モードに入る
  const enterEditMode = () => {
    setEditingTags([...availableTags]);
    setIsEditingAvailable(true);
    setNewTag('');
  };

  // 編集モードをキャンセル
  const cancelEditMode = () => {
    setIsEditingAvailable(false);
    setEditingTags([]);
    setNewTag('');
  };

  // 編集中のタグを追加
  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !editingTags.includes(trimmed)) {
      setEditingTags([...editingTags, trimmed]);
      setNewTag('');
    }
  };

  // 編集中のタグを削除
  const handleRemoveTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  // 保存処理
  const handleSave = () => {
    // 入力中のタグがあれば追加
    let tagsToSave = [...editingTags];
    const pendingTag = newTag.trim();
    if (pendingTag && !tagsToSave.includes(pendingTag)) {
      tagsToSave.push(pendingTag);
    }

    // 削除されたタグを選択から除外
    const removedTags = availableTags.filter(tag => !tagsToSave.includes(tag));
    if (removedTags.length > 0) {
      const newSelectedTags = selectedTags.filter(tag => !removedTags.includes(tag));
      if (newSelectedTags.length !== selectedTags.length) {
        onSelectedTagsChange(newSelectedTags);
      }
    }

    onAvailableTagsChange(tagsToSave);
    setIsEditingAvailable(false);
    setEditingTags([]);
    setNewTag('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // バリデーション: 重複チェック
  const hasDuplicateTag = (): boolean => {
    const trimmed = newTag.trim();
    return trimmed !== '' && editingTags.includes(trimmed);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700">
          タグ
        </label>
        {!isEditingAvailable && (
          <button
            onClick={enterEditMode}
            className="text-gray-500 hover:text-blue-600 transition-colors p-1"
            title="利用可能なタグを編集"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditingAvailable ? (
        // 編集モード：利用可能なタグの管理
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="text-xs font-medium text-blue-700 mb-2">
            タグの追加・削除
          </div>

          {/* 既存タグの編集 */}
          <div className="flex flex-wrap gap-2">
            {editingTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm font-medium border-2 border-gray-200"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 新規タグ追加 */}
          <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="新しいタグを入力"
              className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 transition-all duration-200 ${
                hasDuplicateTag()
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              }`}
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim() || hasDuplicateTag()}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="タグを追加"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          {/* エラーメッセージ */}
          {hasDuplicateTag() && (
            <div className="text-xs text-red-600">
              同じ名前のタグが既にあります
            </div>
          )}

          {/* 保存・キャンセルボタン */}
          <div className="flex items-center gap-2 pt-3 border-t border-blue-200">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
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
        // 通常モード：タグの選択
        <div className="flex flex-wrap gap-2">
          {availableTags.length === 0 ? (
            <div className="text-sm text-gray-500">
              タグがありません。
              <button
                onClick={enterEditMode}
                className="text-blue-600 hover:text-blue-700 ml-1"
              >
                追加する
              </button>
            </div>
          ) : (
            availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {isSelected && <CheckIcon className="w-3 h-3" />}
                  <span>{tag}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
