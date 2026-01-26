/**
 * テンプレートパスユーティリティ
 * 配列要素の水平展開と連想配列のパス正規化を担当
 */

import { AssociativeArrayMapping } from '@/types';

/**
 * 具体的な配列インデックスをワイルドカードに変換してテンプレートパスを生成
 * 例: "SystemUsers[0]:Id" → "SystemUsers[*]:Id"
 */
export function normalizeToTemplatePath(path: string): string {
  return path.replace(/\[\d+\]/g, '[*]');
}

/**
 * パスが配列インデックスを含むかどうかを判定
 * 例: "SystemUsers[0]:Id" → true
 *     "Database:ConnectionString" → false
 */
export function hasArrayIndex(path: string): boolean {
  return /\[\d+\]/.test(path);
}

/**
 * 具体的なパスがテンプレートパスにマッチするかを判定
 * 例: matchesTemplatePath("SystemUsers[1]:Id", "SystemUsers[*]:Id") → true
 */
export function matchesTemplatePath(concretePath: string, templatePath: string): boolean {
  // テンプレートパスの [*] を正規表現パターン [\d+] に変換
  const regexPattern = templatePath
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // 特殊文字をエスケープ
    .replace(/\\\[\\\*\\\]/g, '\\[\\d+\\]'); // [*] を [\d+] に置換

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(concretePath);
}

/**
 * テンプレートパスを実際の配列長に基づいて展開
 * 例: expandTemplatePath("SystemUsers[*]:Id", config) → ["SystemUsers[0]:Id", "SystemUsers[1]:Id", ...]
 */
export function expandTemplatePath(templatePath: string, configData: unknown): string[] {
  const result: string[] = [];

  // テンプレートパスから [*] の位置を特定
  const wildcardMatches = [...templatePath.matchAll(/\[\*\]/g)];
  if (wildcardMatches.length === 0) {
    return [templatePath]; // ワイルドカードがなければそのまま返す
  }

  // 再帰的に展開
  expandTemplatePathRecursive(templatePath, configData, 0, result);

  return result;
}

/**
 * テンプレートパスを再帰的に展開するヘルパー関数
 */
function expandTemplatePathRecursive(
  templatePath: string,
  configData: unknown,
  wildcardIndex: number,
  result: string[]
): void {
  const wildcardMatch = templatePath.match(/\[\*\]/);
  if (!wildcardMatch) {
    // すべてのワイルドカードが置換された
    result.push(templatePath);
    return;
  }

  const wildcardPos = wildcardMatch.index!;
  const pathBeforeWildcard = templatePath.substring(0, wildcardPos);
  const pathAfterWildcard = templatePath.substring(wildcardPos + 3); // "[*]" の長さ

  // パスの前半部分で配列にアクセス
  const arrayValue = getValueByPath(configData, pathBeforeWildcard);

  if (Array.isArray(arrayValue)) {
    for (let i = 0; i < arrayValue.length; i++) {
      const expandedPath = `${pathBeforeWildcard}[${i}]${pathAfterWildcard}`;
      expandTemplatePathRecursive(expandedPath, configData, wildcardIndex + 1, result);
    }
  }
}

/**
 * 連想配列パスを正規化（キー名を配列インデックスに変換）
 * 再帰的に複数の連想配列マッピングを処理
 * ワイルドカード付きマッピング（例: "AppSettings:Fields[*]:Contents:Map"）にも対応
 * 例: "Fields:Field1:Contents:Map:AAA" + mappings(["Fields", "Fields[*]:Contents:Map"])
 *   → "Fields[0]:Contents:Map[0]"
 */
export function normalizeAssociativeArrayPath(
  path: string,
  mappings: AssociativeArrayMapping[],
  configData: unknown
): string {
  // マッピングをbasePathの長さで降順ソート（より具体的なパスを先に処理）
  const sortedMappings = [...mappings].sort((a, b) => b.basePath.length - a.basePath.length);

  let normalizedPath = path;
  let changed = true;

  // 変換が発生しなくなるまで繰り返す（再帰的な連想配列に対応）
  while (changed) {
    changed = false;

    for (const mapping of sortedMappings) {
      const basePath = mapping.basePath;

      // ワイルドカード付きマッピングの場合
      if (basePath.includes('[*]')) {
        const result = applyWildcardMapping(normalizedPath, basePath, configData);
        if (result !== normalizedPath) {
          normalizedPath = result;
          changed = true;
          break;
        }
        continue;
      }

      // 正規化後のパスに対してマッピングを適用するために、
      // basePathも正規化する必要がある（既に変換された部分を考慮）
      const normalizedBasePath = normalizeBasePathForMatching(basePath, sortedMappings, configData);

      // パスがこの連想配列のベースパスで始まるか確認
      if (normalizedPath.startsWith(normalizedBasePath + ':')) {
        // ベースパス以降の部分を取得
        const remainder = normalizedPath.substring(normalizedBasePath.length + 1);
        const parts = remainder.split(':');
        const firstPart = parts[0];

        // 既にインデックス形式になっている場合はスキップ
        if (firstPart.match(/^\[\d+\]/)) {
          continue;
        }

        // キー名と配列インデックスを分離（例: "Field1[0]" → "Field1", "[0]"）
        // これにより連想配列の値が配列の場合にも対応
        const keyNameMatch = firstPart.match(/^([^\[]+)(\[.+)?$/);
        if (!keyNameMatch) {
          continue;
        }
        const keyName = keyNameMatch[1];
        const arrayIndexPart = keyNameMatch[2] || '';

        // 連想配列オブジェクトを取得（元のconfigDataからオリジナルのbasePathで取得）
        const associativeObj = getValueByPath(configData, basePath);
        if (associativeObj && typeof associativeObj === 'object' && !Array.isArray(associativeObj)) {
          const keys = Object.keys(associativeObj);
          const keyIndex = keys.indexOf(keyName);

          if (keyIndex >= 0) {
            // キー名をインデックスに置換（配列インデックスがある場合は保持）
            const restOfPath = parts.slice(1).join(':');
            normalizedPath = `${normalizedBasePath}[${keyIndex}]${arrayIndexPart}${restOfPath ? ':' + restOfPath : ''}`;
            changed = true;
            break; // 変換が発生したら最初からやり直す
          }
        }
      }
    }
  }

  return normalizedPath;
}

/**
 * ワイルドカード付きマッピングを適用するヘルパー関数
 * 例: basePath="AppSettings:Fields[*]:Contents:Map"
 *     path="AppSettings:Fields:Field1:Contents:Map:AAA"
 *     → "AppSettings:Fields[0]:Contents:Map[0]"
 */
function applyWildcardMapping(
  path: string,
  wildcardBasePath: string,
  configData: unknown
): string {
  // ワイルドカードパスを正規表現パターンに変換
  // "AppSettings:Fields[*]:Contents:Map" → "AppSettings:Fields:([^:]+):Contents:Map"
  const patternParts = wildcardBasePath.split(':');
  let regexParts: string[] = [];
  let configPathParts: string[] = [];

  for (const part of patternParts) {
    if (part.endsWith('[*]')) {
      const baseKey = part.slice(0, -3);
      regexParts.push(`${escapeRegex(baseKey)}:([^:]+)`);
      configPathParts.push(baseKey);
      configPathParts.push('$capture'); // キャプチャプレースホルダー
    } else {
      regexParts.push(escapeRegex(part));
      configPathParts.push(part);
    }
  }

  const regexPattern = `^(${regexParts.join(':')})(:(.+))?$`;
  const regex = new RegExp(regexPattern);
  const match = path.match(regex);

  if (!match) {
    return path; // マッチしなければ変更なし
  }

  // キャプチャされたキー名を取得
  const capturedKeys: string[] = [];
  for (let i = 1; i < match.length; i++) {
    if (match[i] && !match[i].startsWith(':') && i > 0) {
      // グループ1は全体マッチ、それ以降がキャプチャグループ
      const potentialKey = match[i];
      // 連想配列のキー名を判定（コロンを含まない、:で始まらない）
      if (potentialKey && !potentialKey.includes(':') && potentialKey !== match[0]) {
        capturedKeys.push(potentialKey);
      }
    }
  }

  // 正規表現から具体的なキーを抽出（改良版）
  const pathParts = path.split(':');
  const wildcardParts = wildcardBasePath.split(':');
  const extractedKeys: { key: string; configPath: string }[] = [];

  let pathIdx = 0;
  let configPath = '';

  for (const wPart of wildcardParts) {
    if (wPart.endsWith('[*]')) {
      const baseKey = wPart.slice(0, -3);
      if (pathParts[pathIdx] === baseKey) {
        configPath = configPath ? `${configPath}:${baseKey}` : baseKey;
        pathIdx++;
        if (pathIdx < pathParts.length) {
          extractedKeys.push({ key: pathParts[pathIdx], configPath });
          pathIdx++;
        }
      } else {
        return path; // マッチしない
      }
    } else {
      if (pathParts[pathIdx] === wPart) {
        configPath = configPath ? `${configPath}:${wPart}` : wPart;
        pathIdx++;
      } else {
        return path; // マッチしない
      }
    }
  }

  // 残りのパス部分（連想配列の後の部分）
  const remainder = pathIdx < pathParts.length ? pathParts.slice(pathIdx).join(':') : '';

  // 各キーをインデックスに変換
  let resultPath = '';
  let currentConfigPath = '';

  for (const wPart of wildcardParts) {
    if (wPart.endsWith('[*]')) {
      const baseKey = wPart.slice(0, -3);
      currentConfigPath = currentConfigPath ? `${currentConfigPath}:${baseKey}` : baseKey;

      // この連想配列のキー情報を探す
      const keyInfo = extractedKeys.find(k => k.configPath === currentConfigPath);
      if (keyInfo) {
        const associativeObj = getValueByPath(configData, currentConfigPath);
        if (associativeObj && typeof associativeObj === 'object' && !Array.isArray(associativeObj)) {
          // キー名と配列インデックスを分離（例: "Field1[0]" → "Field1", "[0]"）
          const keyMatch = keyInfo.key.match(/^([^\[]+)(\[.+)?$/);
          const actualKeyName = keyMatch ? keyMatch[1] : keyInfo.key;
          const arrayIndexPart = keyMatch ? (keyMatch[2] || '') : '';

          const keys = Object.keys(associativeObj);
          const keyIndex = keys.indexOf(actualKeyName);
          if (keyIndex >= 0) {
            resultPath = resultPath ? `${resultPath}:${baseKey}[${keyIndex}]${arrayIndexPart}` : `${baseKey}[${keyIndex}]${arrayIndexPart}`;
            currentConfigPath = `${currentConfigPath}:${actualKeyName}`;
          } else {
            return path; // キーが見つからない
          }
        } else {
          return path; // 連想配列ではない
        }
      }
    } else {
      resultPath = resultPath ? `${resultPath}:${wPart}` : wPart;
      currentConfigPath = currentConfigPath ? `${currentConfigPath}:${wPart}` : wPart;
    }
  }

  // 残りの部分を処理（連想配列の値のキー）
  if (remainder) {
    const remainderParts = remainder.split(':');
    const firstPart = remainderParts[0];

    // 最後の連想配列オブジェクトを取得
    const lastAssocObj = getValueByPath(configData, currentConfigPath);
    if (lastAssocObj && typeof lastAssocObj === 'object' && !Array.isArray(lastAssocObj)) {
      // キー名と配列インデックスを分離（例: "Field1[0]" → "Field1", "[0]"）
      const keyNameMatch = firstPart.match(/^([^\[]+)(\[.+)?$/);
      if (keyNameMatch) {
        const keyName = keyNameMatch[1];
        const arrayIndexPart = keyNameMatch[2] || '';

        const keys = Object.keys(lastAssocObj);
        const keyIndex = keys.indexOf(keyName);
        if (keyIndex >= 0) {
          resultPath = `${resultPath}[${keyIndex}]${arrayIndexPart}`;
          if (remainderParts.length > 1) {
            resultPath = `${resultPath}:${remainderParts.slice(1).join(':')}`;
          }
        } else {
          // キーがインデックス形式の場合はそのまま追加
          resultPath = `${resultPath}:${remainder}`;
        }
      } else {
        resultPath = `${resultPath}:${remainder}`;
      }
    } else {
      resultPath = `${resultPath}:${remainder}`;
    }
  }

  return resultPath;
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * マッチング用にbasePathを正規化するヘルパー関数
 * 親の連想配列が既に正規化されている場合に対応
 */
function normalizeBasePathForMatching(
  basePath: string,
  mappings: AssociativeArrayMapping[],
  configData: unknown
): string {
  // 親の連想配列マッピングを探す
  for (const mapping of mappings) {
    if (basePath.startsWith(mapping.basePath + ':') && mapping.basePath !== basePath) {
      // 親の連想配列の後の部分を取得
      const remainder = basePath.substring(mapping.basePath.length + 1);
      const parts = remainder.split(':');
      const keyName = parts[0];

      // 親の連想配列オブジェクトを取得
      const parentObj = getValueByPath(configData, mapping.basePath);
      if (parentObj && typeof parentObj === 'object' && !Array.isArray(parentObj)) {
        const keys = Object.keys(parentObj);
        const keyIndex = keys.indexOf(keyName);

        if (keyIndex >= 0) {
          // 親のキー名をインデックスに置換して再帰的に正規化
          const restOfBasePath = parts.slice(1).join(':');
          const partiallyNormalized = `${mapping.basePath}[${keyIndex}]${restOfBasePath ? ':' + restOfBasePath : ''}`;
          return normalizeBasePathForMatching(partiallyNormalized, mappings, configData);
        }
      }
    }
  }

  return basePath;
}

/**
 * 具体的なパスからテンプレートパスを取得（連想配列も考慮）
 */
export function getTemplatePathForConcrete(
  concretePath: string,
  mappings: AssociativeArrayMapping[],
  configData?: unknown
): string {
  let path = concretePath;

  // 連想配列の正規化（configDataがある場合のみ）
  if (configData) {
    path = normalizeAssociativeArrayPath(path, mappings, configData);
  }

  // 配列インデックスをワイルドカードに変換
  return normalizeToTemplatePath(path);
}

/**
 * パスから値を取得するヘルパー関数
 * 例: getValueByPath(config, "Database:ConnectionString") → "..."
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (!path || !obj) return obj;

  const keys = path.split(/(?=\[)|:/);
  let value: unknown = obj;

  for (const key of keys) {
    if (value === undefined || value === null) return undefined;

    if (key.startsWith('[') && key.endsWith(']')) {
      // 配列インデックス: [0], [1], etc.
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
 * ドキュメントを検索（直接ルックアップ → テンプレートフォールバック）
 * エクスポートジェネレーターで使用
 */
export function findDocumentationForPath<T extends { path: string; isTemplate?: boolean }>(
  propertyPath: string,
  docsProperties: Record<string, T>,
  mappings: AssociativeArrayMapping[],
  configData?: unknown
): T | undefined {
  // 1. 直接ルックアップ
  const directDoc = docsProperties[propertyPath];
  if (directDoc) {
    return directDoc;
  }

  // 2. テンプレートパスでフォールバック検索
  const templatePath = getTemplatePathForConcrete(propertyPath, mappings, configData);

  if (templatePath !== propertyPath) {
    const templateDoc = docsProperties[templatePath];
    if (templateDoc && templateDoc.isTemplate) {
      return templateDoc;
    }
  }

  // 3. すべてのテンプレートドキュメントを検索
  for (const [docPath, doc] of Object.entries(docsProperties)) {
    if (doc.isTemplate && matchesTemplatePath(propertyPath, docPath)) {
      return doc;
    }
  }

  return undefined;
}

/**
 * テンプレートドキュメントを検索（直接ドキュメントは除外）
 */
export function findTemplateForPath<T extends { path: string; isTemplate?: boolean }>(
  propertyPath: string,
  docsProperties: Record<string, T>,
  mappings: AssociativeArrayMapping[],
  configData?: unknown
): T | undefined {
  // テンプレートパスでフォールバック検索
  const templatePath = getTemplatePathForConcrete(propertyPath, mappings, configData);

  if (templatePath !== propertyPath) {
    const templateDoc = docsProperties[templatePath];
    if (templateDoc && templateDoc.isTemplate) {
      return templateDoc;
    }
  }

  // すべてのテンプレートドキュメントを検索
  for (const [docPath, doc] of Object.entries(docsProperties)) {
    if (doc.isTemplate && matchesTemplatePath(propertyPath, docPath)) {
      return doc;
    }
  }

  return undefined;
}

/**
 * ドキュメントを検索し、テンプレートとマージして返す
 * 直接ドキュメントの空フィールドやタグはテンプレートの値で補完する
 */
export function findAndMergeDocumentation(
  propertyPath: string,
  docsProperties: Record<string, { path: string; isTemplate?: boolean; tags?: string[]; fields?: Record<string, string> }>,
  mappings: AssociativeArrayMapping[],
  configData?: unknown
): { path: string; isTemplate?: boolean; tags?: string[]; fields?: Record<string, string> } | undefined {
  // 直接ドキュメントを検索
  const directDoc = docsProperties[propertyPath];

  // テンプレートドキュメントを検索
  const templateDoc = findTemplateForPath(propertyPath, docsProperties, mappings, configData);

  // 両方ない場合
  if (!directDoc && !templateDoc) {
    return undefined;
  }

  // 直接ドキュメントのみ
  if (directDoc && !templateDoc) {
    return directDoc;
  }

  // テンプレートのみ
  if (!directDoc && templateDoc) {
    return templateDoc;
  }

  // 両方ある場合：マージする（ここに到達した時点で両方が存在することが確定）
  // 直接ドキュメントを優先、空の場合はテンプレートを使用
  const mergedDoc = { ...directDoc! };

  // タグのマージ：直接ドキュメントにタグがない場合はテンプレートを使用
  if ((!directDoc!.tags || directDoc!.tags.length === 0) && templateDoc!.tags && templateDoc!.tags.length > 0) {
    mergedDoc.tags = templateDoc!.tags;
  }

  // フィールドのマージ：各フィールドごとに空の場合はテンプレートを使用
  if (templateDoc!.fields) {
    const mergedFields = { ...(directDoc!.fields || {}) };
    for (const [key, value] of Object.entries(templateDoc!.fields)) {
      // 直接ドキュメントにフィールドがないか、空の場合はテンプレートの値を使用
      if (!mergedFields[key] || mergedFields[key].trim() === '') {
        if (value && value.trim() !== '') {
          mergedFields[key] = value;
        }
      }
    }
    mergedDoc.fields = mergedFields;
  }

  return mergedDoc;
}

/**
 * パスが連想配列の子孫パスかどうかを判定
 */
export function isDescendantOfAssociativeArray(
  path: string,
  mappings: AssociativeArrayMapping[]
): boolean {
  return mappings.some(mapping =>
    path.startsWith(mapping.basePath + ':') || path === mapping.basePath
  );
}

/**
 * 連想配列内のキー名をインデックスに変換した表示用パスを生成
 */
export function getDisplayPathWithIndex(
  path: string,
  mappings: AssociativeArrayMapping[],
  configData: unknown
): string {
  const normalized = normalizeAssociativeArrayPath(path, mappings, configData);
  return normalized;
}

/**
 * 連想配列登録時に親の連想配列キーをワイルドカードに変換したbasePathを生成
 * 例: path="AppSettings:Fields:Field1:Contents:Map" で "AppSettings:Fields" が連想配列の場合
 *     → "AppSettings:Fields[*]:Contents:Map" を返す
 * 例: path="AppSettings:Fields:Field2:Contents:Map:CCC:SubKey"
 *     で "AppSettings:Fields" と "AppSettings:Fields[*]:Contents:Map" が連想配列の場合
 *     → "AppSettings:Fields[*]:Contents:Map[*]:SubKey" を返す
 */
export function convertToWildcardBasePath(
  path: string,
  existingMappings: AssociativeArrayMapping[],
  configData: unknown
): string {
  // 親の連想配列マッピングを探す（短いパスから順に処理して、順番に変換）
  const sortedMappings = [...existingMappings].sort((a, b) => a.basePath.length - b.basePath.length);

  let result = path;
  let changed = true;

  // 変換が発生しなくなるまで繰り返す
  while (changed) {
    changed = false;

    for (const mapping of sortedMappings) {
      const basePath = mapping.basePath;

      // マッピングがワイルドカードを含む場合
      if (basePath.includes('[*]')) {
        // ワイルドカード付きマッピングの処理
        // 例: basePath = "AppSettings:Fields[*]:Contents:Map"
        //     result = "AppSettings:Fields[*]:Contents:Map:CCC:SubKey"
        //     → "AppSettings:Fields[*]:Contents:Map[*]:SubKey"

        // basePathがresultのプレフィックスかどうかをチェック（ワイルドカード展開後）
        // basePath を正規表現パターンに変換
        // "AppSettings:Fields[*]:Contents:Map" → "^AppSettings:Fields\[\*\]:Contents:Map(:(.+))?$"
        const regexPattern = basePath
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\\\[\\\*\\\]/g, '\\[\\*\\]');

        const regex = new RegExp(`^(${regexPattern})(:(.+))?$`);
        const match = result.match(regex);

        if (match) {
          // resultがワイルドカード付きbasePathで始まっている
          const matchedPrefix = match[1]; // "AppSettings:Fields[*]:Contents:Map"
          const remainderWithColon = match[2]; // ":CCC:SubKey" または undefined
          const remainder = match[3]; // "CCC:SubKey" または undefined

          if (remainder) {
            const remainderParts = remainder.split(':');
            const keyName = remainderParts[0];

            // 既にワイルドカードになっている場合はスキップ
            if (keyName === '[*]' || keyName.startsWith('[')) {
              continue;
            }

            // このキー名が連想配列のキーかどうか確認
            // 実際のconfigDataを見るには、result内のワイルドカードを具体的なキーに戻す必要がある
            // しかし、ここでは「連想配列として登録されている」という事実だけで十分
            // basePath自体が連想配列として登録されているなら、その下のキーは全てワイルドカード化すべき

            // キー名をワイルドカードに変換
            const restOfPath = remainderParts.slice(1).join(':');
            result = `${matchedPrefix}[*]${restOfPath ? ':' + restOfPath : ''}`;
            changed = true;
            break;
          }
        }
      } else {
        // 通常の連想配列マッピング
        if (result.startsWith(basePath + ':')) {
          // このパスはbasePathの子孫
          const remainder = result.substring(basePath.length + 1);
          const parts = remainder.split(':');
          const keyName = parts[0];

          // 既にワイルドカードになっている場合はスキップ
          if (keyName === '[*]' || keyName.startsWith('[')) {
            continue;
          }

          // キー名が存在するか確認（configDataから）
          const associativeObj = getValueByPath(configData, basePath);
          if (associativeObj && typeof associativeObj === 'object' && !Array.isArray(associativeObj)) {
            const keys = Object.keys(associativeObj);
            if (keys.includes(keyName)) {
              // キー名をワイルドカードに置換
              const restOfPath = parts.slice(1).join(':');
              result = `${basePath}[*]${restOfPath ? ':' + restOfPath : ''}`;
              changed = true;
              break;
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * 具体的なパスからワイルドカードパターンにマッチする部分のbasePathを抽出
 */
function extractConcreteBasePath(concretePath: string, wildcardBasePath: string): string {
  const concreteParts = concretePath.split(':');
  const wildcardParts = wildcardBasePath.split(':');

  const resultParts: string[] = [];
  let concreteIndex = 0;

  for (const wPart of wildcardParts) {
    if (wPart.endsWith('[*]')) {
      const baseKey = wPart.slice(0, -3);
      if (concreteParts[concreteIndex] === baseKey) {
        resultParts.push(baseKey);
        concreteIndex++;
        // 次の部分（具体的なキー名）を追加
        if (concreteIndex < concreteParts.length) {
          resultParts.push(concreteParts[concreteIndex]);
          concreteIndex++;
        }
      }
    } else {
      if (concreteParts[concreteIndex] === wPart) {
        resultParts.push(wPart);
        concreteIndex++;
      }
    }
  }

  return resultParts.join(':');
}

/**
 * 具体的なパスをワイルドカードパターンに基づいてワイルドカードに変換するヘルパー
 */
function convertConcreteToWildcard(concretePath: string, wildcardPattern: string): string {
  const concreteParts = concretePath.split(':');
  const patternParts = wildcardPattern.split(':');

  const resultParts: string[] = [];
  let concreteIndex = 0;

  for (const patternPart of patternParts) {
    if (patternPart.endsWith('[*]')) {
      // パターンがワイルドカードの場合、具体的な部分を [*] に変換
      const baseKey = patternPart.slice(0, -3);
      if (concreteParts[concreteIndex] === baseKey) {
        resultParts.push(baseKey + '[*]');
        concreteIndex++;
        // 次の部分（キー名）をスキップ
        if (concreteIndex < concreteParts.length) {
          concreteIndex++;
        }
      }
    } else {
      resultParts.push(concreteParts[concreteIndex] || patternPart);
      concreteIndex++;
    }
  }

  return resultParts.join(':');
}
