import { parse } from 'jsonc-parser';

/**
 * BOM（Byte Order Mark）を除去してJSONをパースする
 * UTF-8 BOM (0xFEFF) が含まれているJSONファイルをパースする際に使用
 * JSONC形式（コメント、末尾カンマ）にも対応
 */
export function parseJSON<T = unknown>(content: string): T {
  // UTF-8 BOM (EF BB BF) を除去
  const cleanContent = content.charCodeAt(0) === 0xFEFF
    ? content.slice(1)
    : content;

  return parse(cleanContent) as T;
}

/**
 * BOM（Byte Order Mark）を除去する
 * UTF-8 BOM (0xFEFF) が含まれている文字列をクリーンアップ
 */
export function removeBOM(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}
