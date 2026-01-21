'use client';

import { useState, useMemo } from 'react';
import { PencilIcon, PlusIcon, XIcon, SaveIcon, GripVerticalIcon } from 'lucide-react';

export interface EditingItem {
  originalName: string;
  newName: string;
  isNew: boolean;
}

interface EditableListWrapperProps {
  /** セクションのラベル */
  label: string;
  /** 現在のアイテム一覧 */
  items: string[];
  /** アイテム一覧が変更されたときのコールバック */
  onItemsChange: (items: string[]) => void;
  /** 編集ボタンのtitle属性 */
  editButtonTitle: string;
  /** 編集モードの説明テキスト */
  editModeDescription: string;
  /** 入力欄のプレースホルダー */
  inputPlaceholder: string;
  /** 新規追加入力欄のプレースホルダー */
  newItemPlaceholder: string;
  /** 削除ボタンのtitle属性 */
  deleteButtonTitle: string;
  /** 追加ボタンのtitle属性 */
  addButtonTitle: string;
  /** 重複エラーメッセージ */
  duplicateErrorMessage: string;
  /** 名前変更時に呼ばれるコールバック（旧名 -> 新名のマップ） */
  onRename?: (renamedMap: Record<string, string>) => void;
  /** 通常モードの表示内容 */
  children: React.ReactNode;
}

/**
 * 編集可能なリストを管理する共通コンポーネント
 * タグやフィールドの編集UIで使用
 */
export function EditableListWrapper({
  label,
  items,
  onItemsChange,
  editButtonTitle,
  editModeDescription,
  inputPlaceholder,
  newItemPlaceholder,
  deleteButtonTitle,
  addButtonTitle,
  duplicateErrorMessage,
  onRename,
  children
}: EditableListWrapperProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItems, setEditingItems] = useState<EditingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');

  // ドラッグ&ドロップ用の状態
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ドラッグ中のプレビュー用に並び替えた配列を計算
  const displayItems = useMemo(() => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      return editingItems.map((item, index) => ({ item, originalIndex: index }));
    }

    // ドラッグ中は見た目上の並び替えを表示
    const result = editingItems.map((item, index) => ({ item, originalIndex: index }));
    const [draggedItem] = result.splice(dragIndex, 1);
    result.splice(dragOverIndex, 0, draggedItem);
    return result;
  }, [editingItems, dragIndex, dragOverIndex]);

  // 編集モードに入る
  const enterEditMode = () => {
    const itemList = items.map(name => ({
      originalName: name,
      newName: name,
      isNew: false
    }));
    setEditingItems(itemList);
    setIsEditMode(true);
    setNewItemName('');
  };

  // 編集モードをキャンセル
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditingItems([]);
    setNewItemName('');
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // アイテムを追加（編集モード内）
  const handleAddItem = () => {
    const trimmedName = newItemName.trim();
    if (trimmedName && !editingItems.some(item => item.newName === trimmedName)) {
      setEditingItems([...editingItems, {
        originalName: '',
        newName: trimmedName,
        isNew: true
      }]);
      setNewItemName('');
    }
  };

  // アイテムを削除（編集モード内）
  const handleRemoveItem = (originalIndex: number) => {
    setEditingItems(editingItems.filter((_, i) => i !== originalIndex));
  };

  // アイテム名を変更（編集モード内）
  const handleNameChange = (originalIndex: number, newName: string) => {
    setEditingItems(editingItems.map((item, i) =>
      i === originalIndex ? { ...item, newName } : item
    ));
  };

  // ドラッグ開始
  const handleDragStart = (originalIndex: number) => {
    setDragIndex(originalIndex);
  };

  // ドラッグオーバー（表示上のインデックスで処理）
  const handleDragOver = (e: React.DragEvent, displayIndex: number) => {
    e.preventDefault();
    if (dragIndex === null) return;

    // 表示上のインデックスをそのまま使用
    if (dragOverIndex !== displayIndex) {
      setDragOverIndex(displayIndex);
    }
  };

  // ドロップ時にデータを確定
  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    // 配列の並び替えを確定
    const newItems = [...editingItems];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dragOverIndex, 0, draggedItem);
    setEditingItems(newItems);

    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ドラッグ終了（キャンセル時など）
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // 保存処理
  const handleSave = () => {
    const newItems: string[] = [];
    const renamedMap: Record<string, string> = {};

    for (const item of editingItems) {
      const trimmedName = item.newName.trim();
      if (!trimmedName) continue;

      newItems.push(trimmedName);

      // 名前変更の追跡
      if (!item.isNew && item.originalName !== trimmedName) {
        renamedMap[item.originalName] = trimmedName;
      }
    }

    // 入力中のアイテムがあれば追加
    const pendingName = newItemName.trim();
    if (pendingName && !newItems.includes(pendingName)) {
      newItems.push(pendingName);
    }

    // 名前変更コールバック
    if (onRename && Object.keys(renamedMap).length > 0) {
      onRename(renamedMap);
    }

    onItemsChange(newItems);
    setIsEditMode(false);
    setEditingItems([]);
    setNewItemName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  // バリデーション: 重複チェック
  const hasDuplicateNames = () => {
    const names = editingItems.map(item => item.newName.trim()).filter(Boolean);
    return new Set(names).size !== names.length;
  };

  // バリデーション: 空の名前チェック
  const hasEmptyNames = () => {
    return editingItems.some(item => !item.newName.trim());
  };

  const canSave = !hasDuplicateNames() && !hasEmptyNames();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
        {!isEditMode && (
          <button
            onClick={enterEditMode}
            className="text-gray-500 hover:text-blue-600 transition-colors p-1"
            title={editButtonTitle}
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditMode ? (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="text-xs font-medium text-blue-700 mb-2">
            {editModeDescription}（ドラッグで並び替え可能）
          </div>

          {/* 既存アイテムの編集 */}
          <div className="space-y-2">
            {displayItems.map(({ item, originalIndex }, displayIndex) => {
              const isDragging = dragIndex === originalIndex;

              return (
                <div
                  key={originalIndex}
                  draggable
                  onDragStart={() => handleDragStart(originalIndex)}
                  onDragOver={(e) => handleDragOver(e, displayIndex)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 transition-all ${
                    isDragging ? 'opacity-50' : ''
                  }`}
                >
                  <div
                    className="cursor-grab text-gray-400 hover:text-gray-600 p-1"
                    title="ドラッグして並び替え"
                  >
                    <GripVerticalIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={item.newName}
                    onChange={(e) => handleNameChange(originalIndex, e.target.value)}
                    placeholder={inputPlaceholder}
                    className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 transition-all duration-200 ${
                      !item.newName.trim()
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
                    }`}
                  />
                  <button
                    onClick={() => handleRemoveItem(originalIndex)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-2"
                    title={deleteButtonTitle}
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 新規アイテム追加 */}
          <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={newItemPlaceholder}
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
            />
            <button
              onClick={handleAddItem}
              disabled={!newItemName.trim() || editingItems.some(item => item.newName.trim() === newItemName.trim())}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={addButtonTitle}
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          {/* エラーメッセージ */}
          {hasDuplicateNames() && (
            <div className="text-xs text-red-600 mt-2">
              {duplicateErrorMessage}
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
        children
      )}
    </div>
  );
}
