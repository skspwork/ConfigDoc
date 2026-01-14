# ConfigDoc - AIアシスタントガイド

## プロジェクト概要

**名前:** @skspwork/config-doc
**バージョン:** 0.4.0
**目的:** JSON設定ファイル（例: appsettings.json）用のインタラクティブなドキュメントツール
**リポジトリ:** https://github.com/skspwork/ConfigDoc
**ライセンス:** MIT (Copyright 2026 skspwork)

ConfigDocは、設定ファイルのドキュメントを閲覧、作成、エクスポートするためのWebベースのインターフェースを提供し、永続的なストレージを備えています。

---

## アーキテクチャ概要

### モノレポ構造

```
ConfigDoc/
├── packages/
│   ├── cli/          # コマンドラインインターフェースパッケージ
│   │   └── bin/config-doc.js
│   └── web/          # Next.js Webアプリケーション
│       ├── app/      # Next.js App Routerページ
│       ├── components/
│       ├── lib/      # コアビジネスロジック
│       └── types/    # TypeScript型定義
├── sample/           # サンプルappsettings.json
├── .config_doc/      # 生成されたドキュメントストレージ（gitignore）
├── package.json      # ルート設定
└── README.md
```

### 技術スタック

- **CLIパッケージ:** Node.js実行可能ファイル
- **Webパッケージ:** Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5
- **スタイリング:** Tailwind CSS 4
- **UIコンポーネント:** lucide-react アイコン
- **ランタイム:** APIルートを使用したサーバーサイドレンダリング

### 実行フロー

1. ユーザーが `npx @skspwork/config-doc` を実行
2. CLI（`packages/cli/bin/config-doc.js`）が利用可能なポート（3000-3100）を検索
3. `USER_WORKING_DIR`環境変数を設定してNext.js本番サーバーを起動
4. ブラウザを自動的に開きWebインターフェースを表示
5. ユーザーが設定ファイルを選択し、ドキュメントを追加し、出力をエクスポート
6. ドキュメントはユーザーのプロジェクトの `.config_doc/` ディレクトリに保存

---

## パッケージ詳細

### CLIパッケージ（`packages/cli/`）

**エントリーポイント:** `bin/config-doc.js`

**責務:**
- ポート利用可能性チェック（範囲: 3000-3100）
- Next.jsサーバーの起動（`next start`）
- `USER_WORKING_DIR`環境変数を介してユーザーの作業ディレクトリを渡す
- ブラウザの自動起動
- SIGINT/SIGTERMを処理してグレースフルシャットダウン

**主要ロジック:**
```javascript
// 3000-3100の範囲で空きポートを検索
const port = await findAvailablePort(3000, 3100);

// Webアプリがアクセスできるようにユーザーのcwdを設定
process.env.USER_WORKING_DIR = process.cwd();

// Next.jsサーバーを起動
spawn('node', [nextPath], { env, cwd: webDir });
```

### Webパッケージ（`packages/web/`）

#### App Router構造

**メインページ:** `app/page.tsx`（620行）
- マルチファイル設定管理UI
- JSON構造のツリービュー
- プロパティドキュメントエディター
- 未保存変更の追跡
- 自動エクスポート機能
- トースト通知

#### コンポーネント

| コンポーネント | 目的 |
|-----------|---------|
| `ConfigTree.tsx` | 展開/折りたたみ可能なJSON構造の階層ツリービュー |
| `FileBrowser.tsx` | 複数選択、JSONフィルタリング機能付きファイルシステムブラウザ |
| `ExportDialog.tsx` | エクスポート設定ダイアログ（フォーマット、自動エクスポート） |
| `Toast.tsx` | トースト通知システム |

#### APIルート

| ルート | メソッド | 目的 |
|-------|--------|---------|
| `/api/config/load` | POST | 設定ファイルの読み込み |
| `/api/config/save` | POST | プロパティドキュメントの保存 |
| `/api/config/metadata` | GET/POST | プロジェクトメタデータの管理 |
| `/api/export` | POST | ドキュメントのエクスポート（HTML/Markdown） |
| `/api/export/settings` | GET/POST | エクスポート設定の管理 |
| `/api/files/browse` | GET | ファイルシステムの閲覧 |
| `/api/project` | POST | プロジェクトの初期化と設定 |

#### ライブラリモジュール（`lib/`）

| モジュール | クラス/目的 |
|--------|---------------|
| `fileSystem.ts` | `FileSystemService` - ファイルI/O操作 |
| `storage.ts` | `StorageService` - ドキュメントストレージ管理 |
| `configParser.ts` | JSONパースとツリー構築 |
| `htmlGenerator.ts` | HTMLエクスポートジェネレーター |
| `markdownGenerator.ts` | Markdownエクスポートジェネレーター |
| `markdownTableGenerator.ts` | Markdownテーブル形式エクスポート |
| `getRootPath.ts` | 環境変数からユーザーの作業ディレクトリを取得 |

---

## データストレージモデル

### ディレクトリ構造

すべてのデータはユーザーのプロジェクト内の `.config_doc/` に保存されます（gitignore対象）:

```
.config_doc/
├── project_settings.json      # チーム共有のプロジェクト設定
├── .user_settings.json        # ユーザー固有の設定
├── metadata/
│   └── docs/
│       ├── appsettings.docs.json
│       ├── database.config.docs.json
│       └── ...
└── output/
    └── config-doc.{html|md}   # エクスポートされたドキュメント
```

### ファイル形式

#### `project_settings.json`（チーム共有）
```typescript
{
  projectName: string;           // プロジェクト表示名
  configFiles: string[];         // 設定ファイルへの相対パス
  export: {
    fileName: string;            // 出力ファイル名（拡張子なし）
  };
}
```

#### `.user_settings.json`（ユーザー固有）
```typescript
{
  format: 'html' | 'markdown' | 'markdown-table';
  autoExport: boolean;           // 保存時の自動エクスポート
  lastExportedAt?: string;       // ISOタイムスタンプ
}
```

#### `{filename}.docs.json`（ドキュメントストレージ）
```typescript
{
  configFilePath: string;        // 設定ファイルへの相対パス
  lastModified: string;          // ISOタイムスタンプ
  properties: {
    [path: string]: {            // 例: "Database:ConnectionString"
      path: string;
      description: string;
      notes?: string;
      modifiedAt: string;
    }
  }
}
```

### パス正規化

**重要な規約:** すべてのパスは可搬性のため**相対パス**として保存されます。

- 保存時に絶対パスを相対パスに変換
- Windowsのバックスラッシュをスラッシュに正規化
- ユーザーの作業ディレクトリを基準にパスを解決

---

## 型システム

`types/index.ts`の主要なインターフェース:

### コア型

```typescript
// プロジェクトレベル設定（共有）
interface ProjectSettings {
  projectName: string;
  configFiles: string[];
  export: {
    fileName: string;
  };
}

// ユーザーレベル設定
interface UserSettings {
  format: ExportFormat;
  autoExport: boolean;
  lastExportedAt?: string;
}

// 単一設定ファイルのドキュメント
interface ConfigDocs {
  configFilePath: string;
  lastModified: string;
  properties: Record<string, PropertyDoc>;
}

// 個別プロパティのドキュメント
interface PropertyDoc {
  path: string;
  description: string;
  notes?: string;
  modifiedAt: string;
}

// UIレンダリング用のツリーノード
interface ConfigTreeNode {
  key: string;
  label: string;
  value?: any;
  type: 'object' | 'array' | 'primitive';
  children?: ConfigTreeNode[];
  path: string;
  level: number;
}

// エクスポート形式オプション
type ExportFormat = 'html' | 'markdown' | 'markdown-table';
```

---

## 開発ワークフロー

### ビルドプロセス

```bash
# ルートpackage.jsonスクリプト
npm run build          # Webパッケージをビルド
                      # (cd packages/web && npm install && npm run build)

npm run prepublishOnly # npm公開前に実行

npm run test:local     # tarballを作成し、テスト用にグローバルインストール
                      # (npm pack && npm install -g *.tgz)

npm run unlink         # グローバルパッケージのリンク解除
```

### ローカル開発

```bash
# クローンとセットアップ
git clone https://github.com/skspwork/ConfigDoc.git
cd ConfigDoc

# 開発モード
cd packages/web
npm install
npm run dev         # ポート3000でNext.js開発サーバー起動

# 本番ビルドテスト
cd ../..
npm run build       # Webパッケージをビルド
npm link            # グローバルにリンク
config-doc          # CLIをテスト
```

### Webパッケージスクリプト

```bash
cd packages/web
npm run dev     # 開発サーバー（ホットリロード）
npm run build   # 本番ビルド
npm run start   # 本番サーバー起動
npm run lint    # ESLintチェック
```

### 公開

公開されるファイル（ルート`package.json`の`files`フィールドより）:
- `packages/cli/bin/`
- `packages/cli/package.json`
- `packages/web/app/`, `components/`, `lib/`, `types/`, `public/`
- `packages/web/package.json`
- `packages/web/next.config.ts`, `tsconfig.json`
- `LICENSE`, `README.md`

バイナリエントリーポイント: `config-doc` → `./packages/cli/bin/config-doc.js`

---

## 主要機能と設計パターン

### サービスレイヤーパターン

**FileSystemService**（`lib/fileSystem.ts`）:
- 集中化されたファイルI/O操作
- パスの解決と正規化
- クロスプラットフォーム互換性
- エラーハンドリング

**StorageService**（`lib/storage.ts`）:
- ドキュメントのCRUD操作
- メタデータ管理
- 設定の永続化
- 保存時のパス正規化

### Reactパターン

- **関数コンポーネント:** すべてのコンポーネントでHooksを使用
- **状態管理:** ローカル状態に`useState`、`useEffect`を使用
- **サーバーコンポーネント:** Next.js App Routerのデフォルト
- **クライアントコンポーネント:** `'use client'`ディレクティブでマーク

### パス正規化戦略

```typescript
// 保存時に常に相対パスに変換
function makeRelative(absolutePath: string, basePath: string): string {
  return path.relative(basePath, absolutePath);
}

// パス区切り文字を正規化
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}
```

### 自動エクスポート機能

ユーザー設定で`autoExport: true`の場合:
1. ユーザーがプロパティドキュメントを保存
2. APIルートが`.config_doc/metadata/docs/{filename}.docs.json`に保存
3. `format`設定に基づいて自動的にエクスポートをトリガー
4. `.config_doc/output/`に出力を生成

### 未保存変更の追跡

UIはメモリ内の変更を追跡し、以下の操作前に警告:
- タブの切り替え
- ブラウザを閉じる
- ページから離れる

データの誤った損失を防ぎます。

---

## 使用方法

### ツールの実行

```bash
# インストール不要（推奨）
npx @skspwork/config-doc

# グローバルインストール
npm install -g @skspwork/config-doc
config-doc
```

### ユーザーワークフロー

1. **起動:** CLIがWebインターフェースを起動
2. **ファイル選択:** ファイルブラウザを使用してJSON設定ファイルを選択
3. **ドキュメント作成:** ツリービューのプロパティをクリックし、説明/メモを追加
4. **保存:** ドキュメントを`.config_doc/`に永続化
5. **エクスポート:** HTML/Markdownドキュメントを生成
6. **自動エクスポート（オプション）:** 設定で有効にすると保存時に自動エクスポート

### 初回実行時の動作

1. ユーザーがプロジェクトディレクトリで`npx @skspwork/config-doc`を実行
2. Webインターフェースが開く
3. ユーザーがプロジェクトを作成/初期化（プロジェクト名を設定）
4. `.config_doc/project_settings.json`が作成される
5. `.config_doc/.user_settings.json`がデフォルト値で作成される
6. ユーザーがドキュメント化する設定ファイルを選択
7. ファイルが相対パスとして`project_settings.json`に追加される

---

## 重要な規約

### パス管理

- **ストレージ:** すべてのパスはユーザーの作業ディレクトリに対する相対パスとして保存
- **ランタイム:** ファイル操作のため絶対パスに変換
- **クロスプラットフォーム:** `path.join()`と`path.resolve()`を使用、区切り文字を正規化
- **ユーザー作業ディレクトリ:** `USER_WORKING_DIR`環境変数から取得

### TypeScript

- **Strictモード:** `tsconfig.json`で有効化
- **型安全性:** すべてのデータ構造を完全に型付け
- **`any`の禁止:** `any`型の使用を避ける

### エラーハンドリング

- **APIルート:** 適切なHTTPステータスコードを返す（200、400、500）
- **ユーザーフィードバック:** トースト通知でエラーを表示
- **グレースフルデグラデーション:** ファイル欠落、パースエラーを適切に処理

### クロスプラットフォーム互換性

- **パス:** 文字列連結ではなく`path`モジュールを使用
- **改行コード:** CRLF/LFの違いを処理
- **ファイルエンコーディング:** すべてのJSONファイルはUTF-8
- **ポートバインディング:** 利用可能性をチェック、3000-3100の範囲を使用

### ファイルブラウザのセキュリティ

- **作業ディレクトリ外へのトラバーサル禁止:** ユーザーのプロジェクト内のみ閲覧を制限
- **JSONフィルター:** ファイルブラウザはデフォルトで`.json`ファイルのみを表示
- **相対パス:** フロントエンドに絶対システムパスを公開しない

---

## 最近の開発履歴

最近のコミットより:

- **v0.4.0:** `project_settings.json`への移行とエクスポート修正
- `config_files.json`を`project_settings.json`に統合
- 絶対パスの問題を修正、相対パス保存を強制
- リッチなWeb UIデザインの改善（グラデーション、モダンなスタイリング）
- 公開パッケージバージョンの更新

---

## 要件

- **Node.js:** ≥18.0.0
- **プラットフォーム:** Windows、macOS、Linux
- **ブラウザ:** モダンブラウザ（Chrome、Firefox、Edge、Safari）

---

## トラブルシューティング

### よくある問題

**問題:** `npx @skspwork/config-doc`実行時に`MODULE_NOT_FOUND`エラー
- **原因:** npxキャッシュに依存関係がインストールされていない
- **解決策:** Webパッケージの依存関係をインストールするpostinstallスクリプトを追加

**問題:** `project_settings.json`に絶対パスが保存されている
- **原因:** 古いバージョンまたは手動編集
- **解決策:** UI経由でファイルを再追加（自動的に相対パスに変換）

**問題:** ポート3000がすでに使用中
- **原因:** 別のサービスがポート3000を使用している
- **解決策:** CLIが自動的にポート3000-3100を試行

---

## プロジェクト哲学

- **シンプルさ:** UIをシンプルで焦点を絞った状態に保つ
- **ポータビリティ:** ドキュメントがプロジェクトと一緒に移動
- **チームコラボレーション:** プロジェクト設定は共有、ユーザー設定は個人用
- **ロックイン防止:** プレーンなJSON保存形式、HTML/Markdownにエクスポート可能
- **ゼロコンフィグ:** 適切なデフォルトで箱から出してすぐに動作
