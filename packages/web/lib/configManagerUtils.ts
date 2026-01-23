/**
 * ConfigManager用の純粋関数ユーティリティ
 * テスト可能性を向上させるために抽出された関数群
 */

/**
 * availableTagsOrderで定義された順序でタグをソート
 * availableTagsOrderに含まれないタグは末尾に配置される
 */
export function sortTagsByOrder(
  tags: string[],
  availableTagsOrder: string[]
): string[] {
  return [...tags].sort((a, b) => {
    const indexA = availableTagsOrder.indexOf(a);
    const indexB = availableTagsOrder.indexOf(b);

    // 両方のタグが順序リストに含まれている場合
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // タグaが順序リストにない場合は末尾に配置
    if (indexA === -1) return 1;

    // タグbが順序リストにない場合は末尾に配置
    if (indexB === -1) return -1;

    return 0;
  });
}

/**
 * newFieldKeysの順序でフィールドを並び替え
 * 指定された順序で新しいオブジェクトを作成
 * 存在しないフィールドは空文字列で初期化される
 */
export function reorderFields(
  fields: Record<string, string>,
  newFieldKeys: string[]
): Record<string, string> {
  const reordered: Record<string, string> = {};

  for (const key of newFieldKeys) {
    reordered[key] = fields[key] || '';
  }

  return reordered;
}

/**
 * タグが変更されたか検出（順序または内容）
 */
export function detectTagChanges(
  oldTags: string[],
  newTags: string[]
): boolean {
  if (oldTags.length !== newTags.length) {
    return true;
  }

  return oldTags.some((tag, idx) => tag !== newTags[idx]);
}

/**
 * フィールドが変更されたか検出（値またはキー）
 */
export function detectFieldChanges(
  oldFields: Record<string, string>,
  newFields: Record<string, string>
): boolean {
  const allKeys = new Set([
    ...Object.keys(oldFields),
    ...Object.keys(newFields)
  ]);

  for (const key of allKeys) {
    if ((oldFields[key] || '') !== (newFields[key] || '')) {
      return true;
    }
  }

  return false;
}
