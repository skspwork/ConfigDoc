'use client';

import { useState } from 'react';
import { XIcon, PlusIcon, PencilIcon, CheckIcon } from 'lucide-react';

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
  const [newTag, setNewTag] = useState('');

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  const handleAddAvailableTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      onAvailableTagsChange([...availableTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveAvailableTag = (tagToRemove: string) => {
    onAvailableTagsChange(availableTags.filter(tag => tag !== tagToRemove));
    // 選択されているタグからも削除
    if (selectedTags.includes(tagToRemove)) {
      onSelectedTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAvailableTag();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700">
          型情報
        </label>
        <button
          onClick={() => setIsEditingAvailable(!isEditingAvailable)}
          className={`text-gray-500 hover:text-blue-600 transition-colors ${
            isEditingAvailable ? 'text-blue-600' : ''
          }`}
          title="利用可能なタグを編集"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
      </div>

      {isEditingAvailable ? (
        // 編集モード：利用可能なタグの管理
        <div className="space-y-3">
          <p className="text-xs text-gray-500">利用可能なタグを管理します</p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-300"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveAvailableTag(tag)}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="新しいタグ"
                className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                style={{ width: '120px' }}
              />
              <button
                onClick={handleAddAvailableTag}
                className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                title="タグを追加"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 通常モード：タグの選択
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
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
          })}
        </div>
      )}
    </div>
  );
}
