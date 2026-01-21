import { test, expect } from '@playwright/test';

// 設定ファイルを共有するため、並列実行すると干渉が起きる
test.describe.serial('エクスポート機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ヘッダーのエクスポートボタンでダイアログが開く', async ({ page }) => {
    // エクスポートボタンをクリック
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // ダイアログが表示される
    const dialog = page.getByRole('heading', { name: 'エクスポート設定' });
    await expect(dialog).toBeVisible();
  });

  test('エクスポートダイアログに出力先パスが表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // 出力先パスラベル
    const pathLabel = page.getByText('出力先パス');
    await expect(pathLabel).toBeVisible();

    // 出力先パスの値（font-monoクラスで絶対パスを表示）
    const pathValue = page.locator('.font-mono').filter({ hasText: /config-doc\.html$/ });
    await expect(pathValue).toBeVisible();
  });

  test('エクスポートダイアログに出力先フォルダが表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // 出力先フォルダラベル
    const folderLabel = page.getByText('出力先フォルダ');
    await expect(folderLabel).toBeVisible();

    // デフォルトのフォルダパス
    const folderValue = page.getByText('.config_doc/output');
    await expect(folderValue).toBeVisible();
  });

  test('出力先フォルダのフォルダ選択ボタンが表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // フォルダ選択ボタン
    const folderButton = page.getByTitle('フォルダを選択');
    await expect(folderButton).toBeVisible();
  });

  test('フォルダ選択ボタンをクリックするとフォルダ選択ダイアログが開く', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // フォルダ選択ボタンをクリック
    const folderButton = page.getByTitle('フォルダを選択');
    await folderButton.click();

    // フォルダ選択ダイアログが開く
    const folderDialog = page.getByRole('heading', { name: '出力先フォルダを選択' });
    await expect(folderDialog).toBeVisible();
  });

  test('エクスポートダイアログにファイル名入力欄が表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // ファイル名ラベル
    const fileNameLabel = page.getByText('ファイル名', { exact: true });
    await expect(fileNameLabel).toBeVisible();

    // 入力欄
    const input = page.getByRole('textbox');
    await expect(input).toBeVisible();
  });

  test('エクスポートダイアログにデフォルトファイル名が設定されている', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // デフォルトファイル名
    const input = page.getByRole('textbox');
    await expect(input).toHaveValue('config-doc');
  });

  test('ファイル名を変更できる', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    const input = page.getByRole('textbox');
    await input.clear();
    await input.fill('my-config-doc');

    await expect(input).toHaveValue('my-config-doc');
  });

  test('出力形式のセレクトボックスが表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // 出力形式ラベル
    const formatLabel = page.getByText('出力形式');
    await expect(formatLabel).toBeVisible();

    // セレクトボックス
    const select = page.getByRole('combobox');
    await expect(select).toBeVisible();
  });

  test('出力形式にHTML、Markdown、Markdownテーブルがある', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    const select = page.getByRole('combobox');

    // HTMLオプション
    const htmlOption = page.locator('option[value="html"]');
    await expect(htmlOption).toHaveText('HTML');

    // Markdownオプション
    const mdOption = page.locator('option[value="markdown"]');
    await expect(mdOption).toHaveText('Markdown');

    // Markdownテーブルオプション
    const mdTableOption = page.locator('option[value="markdown-table"]');
    await expect(mdTableOption).toHaveText('Markdown (テーブル形式)');
  });

  test('出力形式を変更すると出力先パスの拡張子が変わる', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // 初期状態はHTML (.html)
    let pathValue = page.getByText(/\.html$/);
    await expect(pathValue).toBeVisible();

    // Markdownに変更
    const select = page.getByRole('combobox');
    await select.selectOption('markdown');

    // 拡張子が.mdに変わる
    pathValue = page.getByText(/\.md$/);
    await expect(pathValue).toBeVisible();
  });

  test('自動エクスポートチェックボックスが表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // チェックボックスラベル
    const autoExportLabel = page.getByText('保存時に自動エクスポート');
    await expect(autoExportLabel).toBeVisible();

    // チェックボックス
    const checkbox = page.locator('#auto-export');
    await expect(checkbox).toBeVisible();
  });

  test('自動エクスポートのON/OFFを切り替えられる', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    const checkbox = page.locator('#auto-export');

    // デフォルトはチェック状態
    await expect(checkbox).toBeChecked();

    // チェックを外す
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();

    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('キャンセルボタンでダイアログが閉じる', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    const dialog = page.getByRole('heading', { name: 'エクスポート設定' });
    await expect(dialog).toBeVisible();

    // キャンセルボタン
    const cancelButton = page.getByRole('button', { name: 'キャンセル' });
    await cancelButton.click();

    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
  });

  test('閉じるボタン（×）でダイアログが閉じる', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    const dialog = page.getByRole('heading', { name: 'エクスポート設定' });
    await expect(dialog).toBeVisible();

    // 閉じるボタン（×）- ダイアログ内のボタンを指定
    const dialogContainer = page.locator('.fixed.inset-0');
    const closeButton = dialogContainer.locator('button').first();
    await closeButton.click();

    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
  });

  test('エクスポートボタンが表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // ダイアログ内のエクスポートボタン
    const dialogExportButton = page.getByRole('button', { name: 'エクスポート' }).last();
    await expect(dialogExportButton).toBeVisible();
  });

  test('エクスポートボタンをクリックするとエクスポートが実行される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // APIレスポンスを待つ
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/export') && response.status() === 200
    );

    // エクスポートボタンをクリック
    const dialogExportButton = page.getByRole('button', { name: 'エクスポート' }).last();
    await dialogExportButton.click();

    // レスポンスを待つ
    await responsePromise;

    // ダイアログが閉じる
    const dialog = page.getByRole('heading', { name: 'エクスポート設定' });
    await expect(dialog).not.toBeVisible();
  });

  test('エクスポート成功時にトースト通知が表示される', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // エクスポートボタンをクリック
    const dialogExportButton = page.getByRole('button', { name: 'エクスポート' }).last();
    await dialogExportButton.click();

    // トースト通知を確認
    const toast = page.getByText(/エクスポートしました/);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
