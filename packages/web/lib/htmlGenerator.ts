import { FileSystemService } from './fileSystem';
import { ProjectConfigFiles, ConfigDocs } from '@/types';

interface ConfigWithDocs {
  filePath: string;
  fileName: string;
  configData: any;
  docs: ConfigDocs;
}

export class HtmlGenerator {
  private fsService: FileSystemService;

  constructor(rootPath: string) {
    this.fsService = new FileSystemService(rootPath);
  }

  async generateHtml(): Promise<string> {
    // メタデータを読み込む
    const metadata = await this.fsService.loadConfigFiles();
    if (!metadata || !metadata.configFiles || metadata.configFiles.length === 0) {
      return this.generateEmptyHtml();
    }

    // 各設定ファイルとそのドキュメントを読み込む
    const configs: ConfigWithDocs[] = [];
    for (const configFile of metadata.configFiles) {
      try {
        const configData = await this.fsService.loadConfigFile(configFile.filePath);
        const docs = await this.fsService.loadConfigDocs(configFile.docsFileName);

        configs.push({
          filePath: configFile.filePath,
          fileName: configFile.fileName,
          configData,
          docs: docs || {
            configFilePath: configFile.filePath,
            lastModified: new Date().toISOString(),
            properties: {}
          }
        });
      } catch (error) {
        console.error(`Failed to load config: ${configFile.filePath}`, error);
      }
    }

    return this.generateFullHtml(metadata, configs);
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

  private generateFullHtml(metadata: ProjectConfigFiles, configs: ConfigWithDocs[]): string {
    const configsJson = JSON.stringify(configs, null, 2);

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(metadata.projectName)} - ConfigDoc</title>
  ${this.getStyles()}
</head>
<body>
  <div class="container">
    <header>
      <div class="header-content">
        <h1>${this.escapeHtml(metadata.projectName)}</h1>
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
    let activeConfigIndex = 0;
    let selectedPath = '';
    let currentSearchQuery = '';

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
      padding: 10px 15px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .config-tab:hover {
      background: #f3f4f6;
    }

    .config-tab.active {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }

    .config-tab.hidden {
      display: none;
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

    .hidden {
      display: none;
    }
  </style>`;
  }

  private getScripts(): string {
    return `
    // ツリー構造を構築
    function buildTree(obj, path = '', docs = {}) {
      const tree = [];

      for (const key in obj) {
        const currentPath = path ? \`\${path}:\${key}\` : key;
        const value = obj[key];
        const hasDoc = docs.properties && docs.properties[currentPath];

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          tree.push({
            key,
            path: currentPath,
            value: value,
            hasChildren: true,
            hasDoc: !!hasDoc,
            children: buildTree(value, currentPath, docs)
          });
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
      const doc = config.docs.properties && config.docs.properties[node.path];

      let html = \`<h2>\${escapeHtml(node.key)}</h2>\`;
      html += \`<div class="property-path">パス: \${escapeHtml(node.path)}</div>\`;
      html += \`<div class="property-value">値: \${escapeHtml(JSON.stringify(node.value, null, 2))}</div>\`;

      if (doc) {
        if (doc.description) {
          html += \`<div class="doc-section">
            <h3>説明</h3>
            <p>\${escapeHtml(doc.description)}</p>
          </div>\`;
        }

        if (doc.notes) {
          html += \`<div class="doc-section">
            <h3>備考</h3>
            <p>\${escapeHtml(doc.notes)}</p>
          </div>\`;
        }

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
        tab.textContent = config.fileName;
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
      const tree = buildTree(config.configData, '', config.docs);
      renderTree(tree, treeEl);
    }

    // 検索フィルタを適用（ツリー項目のフィルタリング）
    function applySearchFilter(query) {
      const items = document.querySelectorAll('.tree-item');
      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const path = item.dataset.path.toLowerCase();

        if (text.includes(query) || path.includes(query)) {
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
          const tree = buildTree(config.configData, '', config.docs);
          const hasMatch = searchInTree(tree, query);
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

    // ツリー内を検索してマッチするか判定
    function searchInTree(nodes, query) {
      for (const node of nodes) {
        const text = node.key.toLowerCase();
        const path = node.path.toLowerCase();

        if (text.includes(query) || path.includes(query)) {
          return true;
        }

        if (node.children && node.children.length > 0) {
          if (searchInTree(node.children, query)) {
            return true;
          }
        }
      }
      return false;
    }

    // HTML エスケープ
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // 初期化
    if (configs.length > 0) {
      renderConfigTabs();
      renderCurrentConfig();
      setupSearch();
    }
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
