/**
 * 共通ユーティリティ関数
 */

/**
 * Markdownテーブルのセル内で特殊文字をエスケープ
 */
export function escapeTableCell(text: string): string {
  return text
    .replace(/\|/g, '\\|')  // パイプをエスケープ
    .replace(/\n/g, '<br>') // 改行をHTMLのbrタグに変換
    .replace(/\r/g, '');     // キャリッジリターンを削除
}

/**
 * HTMLの特殊文字をエスケープ
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * ネストしたオブジェクトからプロパティパスで値を取得
 * @param obj 対象オブジェクト
 * @param propertyPath コロン区切りのプロパティパス（例: "Database:ConnectionString" または "Servers[0]:Name"）
 * @returns 見つかった値、または undefined
 */
export function getPropertyByPath(obj: unknown, propertyPath: string): unknown {
  // "Servers[0]:Name" -> ["Servers", "[0]", "Name"]
  const keys = propertyPath.split(/(?=\[)|:/);
  let value: unknown = obj;

  for (const key of keys) {
    if (value === undefined || value === null) return undefined;

    if (key.startsWith('[') && key.endsWith(']')) {
      // 配列インデックス
      const index = parseInt(key.slice(1, -1), 10);
      if (Array.isArray(value)) {
        value = value[index];
      } else {
        return undefined;
      }
    } else if (key && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else if (key) {
      return undefined;
    }
  }

  return value;
}

/**
 * 値を表示用の文字列に変換
 * プリミティブ値とプリミティブ配列のみ表示し、オブジェクトとオブジェクト配列は'-'を返す
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  const valueType = typeof value;
  const isArray = Array.isArray(value);
  const isObject = valueType === 'object' && !isArray;

  if (isArray) {
    // 配列の場合：要素がプリミティブならば表示
    const hasPrimitiveElements = value.length > 0 && value.every((item: any) =>
      typeof item !== 'object' || item === null
    );
    if (hasPrimitiveElements) {
      return JSON.stringify(value);
    }
    // オブジェクト配列の場合は表示しない
    return '-';
  } else if (isObject) {
    // オブジェクトの場合は表示しない
    return '-';
  }

  // プリミティブ値を表示
  return String(value);
}
