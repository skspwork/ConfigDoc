# ConfigDoc

JSON設定ファイル（appsettings.json等）のインタラクティブなドキュメント管理ツール

## 特徴

- 🌲 **階層的なツリー表示**: JSON設定ファイルを見やすいツリー構造で表示
- 📝 **ドキュメント管理**: 各プロパティに説明、影響ファイル、メモを追加
- 💾 **永続化**: ドキュメントは `.config_doc/` ディレクトリに保存
- 📂 **ファイルブラウザ**: 内蔵のファイルシステムブラウザで設定ファイルを選択
- 📄 **HTMLエクスポート**: スタンドアロンのHTMLドキュメントとして出力
- 🔄 **複数ファイル対応**: プロジェクト内の複数の設定ファイルを管理

## インストールと使用方法

### npx で即座に起動（推奨）

インストール不要で、すぐに使えます：

```bash
npx @skspwork/config-doc
```

### グローバルインストール

頻繁に使う場合は、グローバルにインストール：

```bash
npm install -g @skspwork/config-doc
config-doc
```

## 使い方

1. **起動**: プロジェクトのルートディレクトリで `npx @skspwork/config-doc` を実行
2. **自動起動**: CLIが空きポートを探し、ブラウザが自動で開きます
3. **設定ファイル選択**: ファイルブラウザから `appsettings.json` などを選択
4. **ドキュメント作成**: ツリービューで各プロパティにドキュメントを追加
5. **保存**: ドキュメントは `.config_doc/` に自動保存されます
6. **終了**: ブラウザを閉じて、ターミナルで `Ctrl+C`

## 要件

- Node.js 18.0.0 以上

## プロジェクト構造

```
your-project/
├── appsettings.json          # 設定ファイル
├── .config_doc/              # ConfigDoc が作成（自動生成）
│   ├── config_files.json     # 設定ファイル情報
│   ├── docs/                 # ドキュメントファイル
│   │   └── appsettings.docs.json
│   └── index.html            # エクスポートされたHTML
└── ...
```

## 開発

このリポジトリを開発用にセットアップする場合：

```bash
# リポジトリをクローン
git clone https://github.com/skspwork/ConfigDoc.git
cd ConfigDoc

# 依存関係をインストール
cd packages/web
npm install

# 開発サーバーを起動
npm run dev

# ビルド
npm run build

# ローカルでテスト（プロジェクトルートから）
cd ../..
npm run build
npm link
```

## ライセンス

MIT License - Copyright (c) 2026 skspwork

詳細は [LICENSE](LICENSE) ファイルを参照してください。

## リンク

- [GitHub Repository](https://github.com/skspwork/ConfigDoc)
- [Issues](https://github.com/skspwork/ConfigDoc/issues)
