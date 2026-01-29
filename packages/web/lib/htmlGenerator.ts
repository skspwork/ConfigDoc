import { FileSystemService } from './fileSystem';
import { StorageService } from './storage';
import { escapeHtml } from './utils';
import { ProjectConfigFiles, ConfigDocs, AssociativeArrayMapping } from '@/types';
import { sortTagsByOrder } from './configManagerUtils';

interface ConfigWithDocs {
  filePath: string;
  fileName: string;
  configData: any;
  docs: ConfigDocs;
}

export class HtmlGenerator {
  private fsService: FileSystemService;
  private storageService: StorageService;

  constructor(rootPath: string) {
    this.fsService = new FileSystemService(rootPath);
    this.storageService = new StorageService(this.fsService);
  }

  async generateHtml(): Promise<string> {
    // プロジェクト設定を読み込む
    const settings = await this.fsService.loadProjectSettings();
    if (!settings || !settings.configFiles || settings.configFiles.length === 0) {
      return this.generateEmptyHtml();
    }

    // フィールドの順序を取得
    const fieldKeys = settings.fields ? Object.keys(settings.fields) : [];

    // タグの順序を取得
    const availableTags = settings.availableTags || [];

    // 各設定ファイルとそのドキュメントを読み込む
    const configs: ConfigWithDocs[] = [];
    for (const filePath of settings.configFiles) {
      try {
        const fileName = filePath.split(/[/\\]/).pop() || 'config.json';
        const docsFileName = this.storageService.getDocsFileName(filePath);

        const configData = await this.fsService.loadConfigFile(filePath);
        const docs = await this.fsService.loadConfigDocs(docsFileName);

        configs.push({
          filePath,
          fileName,
          configData,
          docs: docs || {
            configFilePath: filePath,
            lastModified: new Date().toISOString(),
            properties: {}
          }
        });
      } catch (error) {
        console.error(`Failed to load config: ${filePath}`, error);
      }
    }

    // 互換性のため ProjectConfigFiles 形式に変換
    const metadata: ProjectConfigFiles = {
      projectName: settings.projectName,
      createdAt: '',
      lastModified: new Date().toISOString(),
      configFiles: []
    };

    return this.generateFullHtml(metadata, configs, fieldKeys, availableTags, settings.associativeArrays || []);
  }

  private generateEmptyHtml(): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ConfigDoc - ドキュメント</title>
  ${this.getStyles()}
</head>
<body>
  <div class="container">
    <header>
      <h1>ConfigDoc ドキュメント</h1>
      <p class="subtitle">設定ファイルのドキュメントがまだありません</p>
    </header>
    <main>
      <p>設定ファイルを選択してドキュメントを作成してください。</p>
    </main>
  </div>
</body>
</html>`;
  }

  private generateFullHtml(metadata: ProjectConfigFiles, configs: ConfigWithDocs[], fieldKeys: string[], availableTags: string[], associativeArrays: AssociativeArrayMapping[]): string {
    const configsJson = JSON.stringify(configs, null, 2);
    const fieldKeysJson = JSON.stringify(fieldKeys);
    const availableTagsJson = JSON.stringify(availableTags);
    const associativeArraysJson = JSON.stringify(associativeArrays);

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.projectName)} - ConfigDoc</title>
  ${this.getStyles()}
</head>
<body>
  <div class="container">
    <header>
      <div class="header-content">
        <h1>${escapeHtml(metadata.projectName)}</h1>
        <p class="meta">最終更新: ${new Date(metadata.lastModified).toLocaleString('ja-JP')}</p>
      </div>
    </header>

    <div class="content">
      <aside class="sidebar">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="検索..." />
        </div>
        <div class="config-tabs" id="configTabs"></div>
        <div class="tree-container" id="treeContainer"></div>
      </aside>
      <main class="main-content">
        <div id="propertyDetail" class="property-detail">
          <p class="placeholder">左側のツリーからプロパティを選択してください</p>
        </div>
      </main>
    </div>
  </div>

  <script>
    const configs = ${configsJson};
    const fieldKeys = ${fieldKeysJson};
    const availableTags = ${availableTagsJson};
    const associativeArrays = ${associativeArraysJson};
    let activeConfigIndex = 0;
    let selectedPath = '';
    let currentSearchQuery = '';

    // タグをavailableTagsの順序でソート
    function sortTagsByOrder(tags) {
      if (!tags || tags.length === 0) return [];
      return [...tags].sort((a, b) => {
        const indexA = availableTags.indexOf(a);
        const indexB = availableTags.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return 0;
      });
    }

    // テンプレートパスに変換（配列インデックスをワイルドカードに）
    function normalizeToTemplatePath(path) {
      return path.replace(/\\[\\d+\\]/g, '[*]');
    }

    // テンプレートパスにマッチするか判定
    function matchesTemplatePath(concretePath, templatePath) {
      const regexPattern = templatePath
        .replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')
        .replace(/\\\\\\[\\\\\\*\\\\\\]/g, '\\\\[\\\\d+\\\\]');
      const regex = new RegExp('^' + regexPattern + '\$');
      return regex.test(concretePath);
    }

    // パスから値を取得するヘルパー関数
    function getValueByPath(obj, path) {
      if (!path || !obj) return obj;
      const keys = path.split(/(?=\\[)|:/);
      let value = obj;
      for (const key of keys) {
        if (value === undefined || value === null) return undefined;
        if (key.startsWith('[') && key.endsWith(']')) {
          const index = parseInt(key.slice(1, -1), 10);
          if (Array.isArray(value)) {
            value = value[index];
          } else {
            return undefined;
          }
        } else if (key && typeof value === 'object' && key in value) {
          value = value[key];
        } else if (key) {
          return undefined;
        }
      }
      return value;
    }

    // マッチング用にbasePathを正規化するヘルパー関数
    function normalizeBasePathForMatching(basePath, mappings, configData) {
      for (const mapping of mappings) {
        if (basePath.startsWith(mapping.basePath + ':') && mapping.basePath !== basePath) {
          const remainder = basePath.substring(mapping.basePath.length + 1);
          const parts = remainder.split(':');
          const keyName = parts[0];
          const parentObj = getValueByPath(configData, mapping.basePath);
          if (parentObj && typeof parentObj === 'object' && !Array.isArray(parentObj)) {
            const keys = Object.keys(parentObj);
            const keyIndex = keys.indexOf(keyName);
            if (keyIndex >= 0) {
              const restOfBasePath = parts.slice(1).join(':');
              const partiallyNormalized = mapping.basePath + '[' + keyIndex + ']' + (restOfBasePath ? ':' + restOfBasePath : '');
              return normalizeBasePathForMatching(partiallyNormalized, mappings, configData);
            }
          }
        }
      }
      return basePath;
    }

    // ワイルドカード付きマッピングを適用するヘルパー関数
    function applyWildcardMapping(path, wildcardBasePath, configData) {
      const patternParts = wildcardBasePath.split(':');
      const pathParts = path.split(':');
      const extractedKeys = [];

      let pathIdx = 0;
      let configPath = '';

      for (const wPart of patternParts) {
        if (wPart.endsWith('[*]')) {
          const baseKey = wPart.slice(0, -3);
          if (pathParts[pathIdx] === baseKey) {
            configPath = configPath ? configPath + ':' + baseKey : baseKey;
            pathIdx++;
            if (pathIdx < pathParts.length) {
              extractedKeys.push({ key: pathParts[pathIdx], configPath });
              pathIdx++;
            }
          } else {
            return path;
          }
        } else {
          if (pathParts[pathIdx] === wPart) {
            configPath = configPath ? configPath + ':' + wPart : wPart;
            pathIdx++;
          } else {
            return path;
          }
        }
      }

      const remainder = pathIdx < pathParts.length ? pathParts.slice(pathIdx).join(':') : '';

      let resultPath = '';
      let currentConfigPath = '';

      for (const wPart of patternParts) {
        if (wPart.endsWith('[*]')) {
          const baseKey = wPart.slice(0, -3);
          currentConfigPath = currentConfigPath ? currentConfigPath + ':' + baseKey : baseKey;

          const keyInfo = extractedKeys.find(k => k.configPath === currentConfigPath);
          if (keyInfo) {
            const associativeObj = getValueByPath(configData, currentConfigPath);
            if (associativeObj && typeof associativeObj === 'object' && !Array.isArray(associativeObj)) {
              const keys = Object.keys(associativeObj);
              const keyIndex = keys.indexOf(keyInfo.key);
              if (keyIndex >= 0) {
                resultPath = resultPath ? resultPath + ':' + baseKey + '[' + keyIndex + ']' : baseKey + '[' + keyIndex + ']';
                currentConfigPath = currentConfigPath + ':' + keyInfo.key;
              } else {
                return path;
              }
            } else {
              return path;
            }
          }
        } else {
          resultPath = resultPath ? resultPath + ':' + wPart : wPart;
          currentConfigPath = currentConfigPath ? currentConfigPath + ':' + wPart : wPart;
        }
      }

      if (remainder) {
        const remainderParts = remainder.split(':');
        const firstKey = remainderParts[0];

        const lastAssocObj = getValueByPath(configData, currentConfigPath);
        if (lastAssocObj && typeof lastAssocObj === 'object' && !Array.isArray(lastAssocObj)) {
          const keys = Object.keys(lastAssocObj);
          const keyIndex = keys.indexOf(firstKey);
          if (keyIndex >= 0) {
            resultPath = resultPath + '[' + keyIndex + ']';
            if (remainderParts.length > 1) {
              resultPath = resultPath + ':' + remainderParts.slice(1).join(':');
            }
          } else {
            resultPath = resultPath + ':' + remainder;
          }
        } else {
          resultPath = resultPath + ':' + remainder;
        }
      }

      return resultPath;
    }

    // 連想配列パスを正規化（キー名を配列インデックスに変換）- 再帰的に処理
    // ワイルドカード付きマッピングにも対応
    function normalizeAssociativeArrayPath(path, mappings, configData) {
      const sortedMappings = [...mappings].sort((a, b) => b.basePath.length - a.basePath.length);
      let normalizedPath = path;
      let changed = true;

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

          const normalizedBasePath = normalizeBasePathForMatching(basePath, sortedMappings, configData);

          if (normalizedPath.startsWith(normalizedBasePath + ':')) {
            const remainder = normalizedPath.substring(normalizedBasePath.length + 1);
            const parts = remainder.split(':');
            const keyName = parts[0];

            if (keyName.match(/^\[\d+\]$/)) {
              continue;
            }

            const associativeObj = getValueByPath(configData, basePath);
            if (associativeObj && typeof associativeObj === 'object' && !Array.isArray(associativeObj)) {
              const keys = Object.keys(associativeObj);
              const keyIndex = keys.indexOf(keyName);
              if (keyIndex >= 0) {
                const restOfPath = parts.slice(1).join(':');
                normalizedPath = normalizedBasePath + '[' + keyIndex + ']' + (restOfPath ? ':' + restOfPath : '');
                changed = true;
                break;
              }
            }
          }
        }
      }
      return normalizedPath;
    }

    // 具体的なパスからテンプレートパスを取得（連想配列も考慮）
    function getTemplatePathForConcrete(concretePath, mappings, configData) {
      let path = concretePath;
      if (configData) {
        path = normalizeAssociativeArrayPath(path, mappings, configData);
      }
      return normalizeToTemplatePath(path);
    }

    // ドキュメントを検索（テンプレートフォールバック付き）
    function findDocumentationForPath(propertyPath, docsProperties, configData) {
      // 1. 直接ルックアップ
      if (docsProperties[propertyPath]) {
        return docsProperties[propertyPath];
      }

      // 2. テンプレートパスでフォールバック検索（連想配列も考慮）
      const templatePath = getTemplatePathForConcrete(propertyPath, associativeArrays, configData);
      if (templatePath !== propertyPath && docsProperties[templatePath]) {
        const doc = docsProperties[templatePath];
        if (doc.isTemplate) {
          return doc;
        }
      }

      // 3. すべてのテンプレートドキュメントを検索
      for (const [docPath, doc] of Object.entries(docsProperties)) {
        if (doc.isTemplate && matchesTemplatePath(propertyPath, docPath)) {
          return doc;
        }
      }

      return null;
    }

    // テンプレートドキュメントのみを検索（連想配列も考慮）
    function findTemplateForPath(propertyPath, docsProperties, configData) {
      const templatePath = getTemplatePathForConcrete(propertyPath, associativeArrays, configData);
      if (templatePath !== propertyPath && docsProperties[templatePath]) {
        const doc = docsProperties[templatePath];
        if (doc.isTemplate) {
          return doc;
        }
      }

      for (const [docPath, doc] of Object.entries(docsProperties)) {
        if (doc.isTemplate && matchesTemplatePath(propertyPath, docPath)) {
          return doc;
        }
      }

      return null;
    }

    // ドキュメントを検索してマージ（直接ドキュメントの空フィールドをテンプレートで補完）
    function findAndMergeDocumentation(propertyPath, docsProperties, configData) {
      const directDoc = docsProperties[propertyPath];
      const templateDoc = findTemplateForPath(propertyPath, docsProperties, configData);

      if (!directDoc && !templateDoc) return null;
      if (directDoc && !templateDoc) return directDoc;
      if (!directDoc && templateDoc) return templateDoc;

      // 両方ある場合：マージ
      const mergedDoc = { ...directDoc };

      // タグのマージ
      if ((!directDoc.tags || directDoc.tags.length === 0) && templateDoc.tags && templateDoc.tags.length > 0) {
        mergedDoc.tags = templateDoc.tags;
      }

      // フィールドのマージ
      if (templateDoc.fields) {
        const mergedFields = { ...(directDoc.fields || {}) };
        for (const [key, value] of Object.entries(templateDoc.fields)) {
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

    ${this.getScripts()}
  </script>
</body>
</html>`;
  }

  private getStyles(): string {
    return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .header-content {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 20px;
    }

    header h1 {
      font-size: 2rem;
      color: #2563eb;
      margin: 0;
    }

    .meta {
      color: #999;
      font-size: 0.9rem;
      white-space: nowrap;
      margin: 0;
    }

    .content {
      display: flex;
      gap: 20px;
    }

    .sidebar {
      flex: 0 0 350px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .search-box {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
    }

    #searchInput {
      width: 100%;
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    #searchInput:focus {
      outline: none;
      border-color: #2563eb;
    }

    .config-tabs {
      border-bottom: 1px solid #e5e7eb;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .config-tab {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .config-tab:hover {
      background: #f3f4f6;
    }

    .config-tab.active {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }

    .config-tab.active .config-tab-path {
      color: rgba(255, 255, 255, 0.8);
    }

    .config-tab.hidden {
      display: none;
    }

    .config-tab-filename {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .config-tab-path {
      font-size: 0.75rem;
      color: #9ca3af;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .tree-container {
      padding: 10px;
      max-height: 600px;
      overflow-y: auto;
    }

    .tree-container > ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tree-node {
      margin-left: 0;
      padding-left: 20px;
      border-left: 1px solid #e5e7eb;
      list-style: none;
    }

    .tree-node.hidden {
      display: none;
    }

    .tree-item {
      padding: 6px 10px;
      margin: 2px 0;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      position: relative;
      background: transparent;
      border: 1px solid transparent;
    }

    .tree-item:hover {
      background: #f9fafb;
      border-color: #e5e7eb;
      transform: translateX(2px);
    }

    .tree-item.selected {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #1e40af;
      font-weight: 500;
      border-color: #93c5fd;
      box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
    }

    .tree-item.has-doc {
      position: relative;
      padding-left: 28px;
    }

    .tree-item.has-doc::before {
      content: '📝';
      position: absolute;
      left: 8px;
      font-size: 0.85rem;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
    }

    .tree-toggle {
      cursor: pointer;
      user-select: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 0.7rem;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .tree-toggle:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .tree-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-item-parent {
      font-weight: 500;
      color: #374151;
    }

    .tree-item-leaf {
      color: #6b7280;
    }

    .main-content {
      flex: 1;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }

    .property-detail h2 {
      color: #2563eb;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }

    .property-file {
      font-size: 0.85rem;
      color: #6b7280;
      background: #f9fafb;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 12px;
      font-family: 'Courier New', monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: help;
    }

    .property-path {
      background: #f3f4f6;
      padding: 10px 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .property-value {
      background: #fef3c7;
      padding: 10px 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .doc-section {
      margin-bottom: 30px;
    }

    .doc-section h3 {
      color: #374151;
      margin-bottom: 10px;
      font-size: 1.1rem;
    }

    .doc-section p {
      color: #4b5563;
      line-height: 1.8;
    }

    .doc-section p.field-value {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .placeholder {
      color: #9ca3af;
      text-align: center;
      padding: 60px 20px;
      font-size: 1.1rem;
    }

    .no-doc-message {
      background: #fef3c7;
      padding: 20px;
      border-radius: 4px;
      border-left: 4px solid #f59e0b;
      margin-top: 20px;
    }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .tag {
      display: inline-block;
      padding: 4px 12px;
      background: #3b82f6;
      color: white;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .hidden {
      display: none;
    }
  </style>`;
  }

  private getScripts(): string {
    return `
    // ツリー構造を構築
    function buildTree(obj, path = '', docs = {}, configData = null) {
      const tree = [];

      for (const key in obj) {
        const currentPath = path ? \`\${path}:\${key}\` : key;
        const value = obj[key];
        const hasDoc = docs.properties && findDocumentationForPath(currentPath, docs.properties, configData);

        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            // 配列の場合：オブジェクト要素があれば展開
            const hasObjectElements = value.some(
              item => item && typeof item === 'object' && !Array.isArray(item)
            );
            if (hasObjectElements) {
              const children = [];
              value.forEach((item, index) => {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                  const elementPath = \`\${currentPath}[\${index}]\`;
                  children.push({
                    key: \`[\${index}]\`,
                    path: elementPath,
                    value: item,
                    hasChildren: true,
                    hasDoc: !!(docs.properties && findDocumentationForPath(elementPath, docs.properties, configData)),
                    children: buildTree(item, elementPath, docs, configData)
                  });
                }
              });
              tree.push({
                key,
                path: currentPath,
                value: value,
                hasChildren: children.length > 0,
                hasDoc: !!hasDoc,
                children: children
              });
            } else {
              // プリミティブ配列は展開しない
              tree.push({
                key,
                path: currentPath,
                value: value,
                hasChildren: false,
                hasDoc: !!hasDoc,
                children: []
              });
            }
          } else {
            // オブジェクトの場合（既存ロジック）
            tree.push({
              key,
              path: currentPath,
              value: value,
              hasChildren: true,
              hasDoc: !!hasDoc,
              children: buildTree(value, currentPath, docs, configData)
            });
          }
        } else {
          tree.push({
            key,
            path: currentPath,
            value: value,
            hasChildren: false,
            hasDoc: !!hasDoc,
            children: []
          });
        }
      }

      return tree;
    }

    // ツリーをレンダリング
    function renderTree(nodes, containerEl, level = 0) {
      const ul = document.createElement('ul');
      ul.className = level === 0 ? '' : 'tree-node';

      nodes.forEach(node => {
        const li = document.createElement('li');
        const itemDiv = document.createElement('div');

        // クラス名を組み立て
        let className = 'tree-item';
        if (node.hasDoc) className += ' has-doc';
        if (node.hasChildren) className += ' tree-item-parent';
        else className += ' tree-item-leaf';
        itemDiv.className = className;
        itemDiv.dataset.path = node.path;

        if (node.hasChildren) {
          const toggle = document.createElement('span');
          toggle.className = 'tree-toggle';
          toggle.innerHTML = '▾';
          itemDiv.appendChild(toggle);

          const label = document.createElement('span');
          label.className = 'tree-label';
          label.textContent = node.key;
          itemDiv.appendChild(label);

          li.appendChild(itemDiv);

          const childrenUl = document.createElement('ul');
          childrenUl.className = 'tree-node';
          renderTree(node.children, childrenUl, level + 1);
          li.appendChild(childrenUl);

          toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            childrenUl.classList.toggle('hidden');
            toggle.innerHTML = childrenUl.classList.contains('hidden') ? '▸' : '▾';
          });
        } else {
          const label = document.createElement('span');
          label.className = 'tree-label';
          label.textContent = node.key;
          itemDiv.appendChild(label);
          li.appendChild(itemDiv);
        }

        itemDiv.addEventListener('click', () => {
          document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
          itemDiv.classList.add('selected');
          selectedPath = node.path;
          showPropertyDetail(node);
        });

        ul.appendChild(li);
      });

      containerEl.appendChild(ul);
    }

    // プロパティ詳細を表示
    function showPropertyDetail(node) {
      const detailEl = document.getElementById('propertyDetail');
      const config = configs[activeConfigIndex];
      const doc = config.docs.properties ? findAndMergeDocumentation(node.path, config.docs.properties, config.configData) : null;

      let html = \`<h2>\${escapeHtml(node.key)}</h2>\`;
      html += \`<div class="property-file" title="\${escapeHtml(config.filePath)}">ファイル: \${escapeHtml(config.filePath)}</div>\`;
      html += \`<div class="property-path">パス: \${escapeHtml(node.path)}</div>\`;
      html += \`<div class="property-value">値: \${escapeHtml(JSON.stringify(node.value, null, 2))}</div>\`;

      if (doc) {
        if (doc.tags && doc.tags.length > 0) {
          const sortedTags = sortTagsByOrder(doc.tags);
          html += \`<div class="doc-section">
            <h3>タグ</h3>
            <div class="tag-list">\`;
          sortedTags.forEach(tag => {
            html += \`<span class="tag">\${escapeHtml(tag)}</span>\`;
          });
          html += \`</div>
          </div>\`;
        }

        // フィールドをprojectFieldsの順序で表示
        fieldKeys.forEach(label => {
          const value = doc.fields[label];
          if (value) {
            html += \`<div class="doc-section">
              <h3>\${escapeHtml(label)}</h3>
              <p class="field-value">\${escapeHtml(value)}</p>
            </div>\`;
          }
        });

        if (doc.modifiedAt) {
          html += \`<div class="doc-section">
            <p style="color: #9ca3af; font-size: 0.9rem;">
              最終更新: \${new Date(doc.modifiedAt).toLocaleString('ja-JP')}
            </p>
          </div>\`;
        }
      } else {
        html += \`<div class="no-doc-message">
          <p>このプロパティにはまだドキュメントが作成されていません。</p>
        </div>\`;
      }

      detailEl.innerHTML = html;
    }

    // 設定タブを描画
    function renderConfigTabs(matchedConfigIndexes = null) {
      const tabsEl = document.getElementById('configTabs');
      tabsEl.innerHTML = '';

      configs.forEach((config, index) => {
        const tab = document.createElement('div');
        let className = 'config-tab';

        if (index === activeConfigIndex) {
          className += ' active';
        }

        // 検索中で、マッチしない設定ファイルは非表示
        if (matchedConfigIndexes !== null && !matchedConfigIndexes.includes(index)) {
          className += ' hidden';
        }

        tab.className = className;
        tab.innerHTML = \`
          <div class="config-tab-filename">\${escapeHtml(config.fileName)}</div>
          <div class="config-tab-path" title="\${escapeHtml(config.filePath)}">\${escapeHtml(config.filePath)}</div>
        \`;
        tab.addEventListener('click', () => {
          activeConfigIndex = index;
          renderConfigTabs(matchedConfigIndexes);
          renderCurrentConfig();
          // タブ切り替え後、検索フィルタを適用
          if (currentSearchQuery) {
            applySearchFilter(currentSearchQuery);
          }
        });
        tabsEl.appendChild(tab);
      });

    }

    // 現在の設定を描画
    function renderCurrentConfig() {
      const treeEl = document.getElementById('treeContainer');
      treeEl.innerHTML = '';

      const config = configs[activeConfigIndex];
      const tree = buildTree(config.configData, '', config.docs, config.configData);
      renderTree(tree, treeEl);
    }

    // 検索フィルタを適用（ツリー項目のフィルタリング - プロパティ名、パス、説明、備考を検索）
    function applySearchFilter(query) {
      const config = configs[activeConfigIndex];
      const items = document.querySelectorAll('.tree-item');

      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const path = item.dataset.path.toLowerCase();
        let matched = false;

        // プロパティ名とパスで検索
        if (text.includes(query) || path.includes(query)) {
          matched = true;
        }

        // ドキュメント（フィールド内容）でも検索
        if (!matched) {
          const doc = config.docs.properties && config.docs.properties[item.dataset.path];
          if (doc && doc.fields) {
            for (const [label, value] of Object.entries(doc.fields)) {
              if (value && value.toLowerCase().includes(query)) {
                matched = true;
                break;
              }
            }
          }
        }

        if (matched) {
          item.style.display = '';
          // 親要素も表示
          let parent = item.parentElement;
          while (parent) {
            if (parent.classList.contains('tree-node')) {
              parent.classList.remove('hidden');
            }
            parent = parent.parentElement;
          }
        } else {
          item.style.display = 'none';
        }
      });
    }

    // 検索機能（全設定ファイル対象）
    function setupSearch() {
      const searchInput = document.getElementById('searchInput');
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        currentSearchQuery = query;

        if (!query.trim()) {
          // 検索クエリが空の場合、すべてのタブを表示
          renderConfigTabs(null);
          renderCurrentConfig();
          return;
        }

        // 全設定ファイルから検索してマッチした項目を収集
        let foundInConfigs = [];
        configs.forEach((config, index) => {
          const tree = buildTree(config.configData, '', config.docs, config.configData);
          const hasMatch = searchInTreeForConfig(tree, query, config);
          if (hasMatch) {
            foundInConfigs.push(index);
          }
        });

        // マッチした設定ファイルのタブのみ表示
        renderConfigTabs(foundInConfigs);

        // マッチした最初の設定ファイルに切り替え（現在のタブがマッチしていない場合）
        if (foundInConfigs.length > 0 && !foundInConfigs.includes(activeConfigIndex)) {
          activeConfigIndex = foundInConfigs[0];
          renderConfigTabs(foundInConfigs);
          renderCurrentConfig();
        }

        // 現在表示中のツリー項目をフィルタリング
        applySearchFilter(query);
      });
    }

    // ツリー内を検索してマッチするか判定（特定の設定ファイル用）
    function searchInTreeForConfig(nodes, query, config) {
      for (const node of nodes) {
        const text = node.key.toLowerCase();
        const path = node.path.toLowerCase();

        // プロパティ名とパスで検索
        if (text.includes(query) || path.includes(query)) {
          return true;
        }

        // ドキュメント（フィールド内容）でも検索
        const doc = config.docs.properties && config.docs.properties[node.path];
        if (doc && doc.fields) {
          for (const [label, value] of Object.entries(doc.fields)) {
            if (value && value.toLowerCase().includes(query)) {
              return true;
            }
          }
        }

        if (node.children && node.children.length > 0) {
          if (searchInTreeForConfig(node.children, query, config)) {
            return true;
          }
        }
      }
      return false;
    }

    // HTML エスケープ（$記号もエスケープしてKaTeX/MathJax数式解釈を防止）
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML.replace(/\\$/g, '&#36;');
    }

    // 初期化
    if (configs.length > 0) {
      renderConfigTabs();
      renderCurrentConfig();
      setupSearch();
    }
    `;
  }
}
