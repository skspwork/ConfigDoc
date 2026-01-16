import { test, expect } from '@playwright/test';

test.describe('ConfigDoc 基本ワークフロー', () => {
  test('アプリケーションが起動する', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ConfigDoc/);
  });

  test('初期画面が表示される', async ({ page }) => {
    await page.goto('/');

    // プロジェクト作成ボタンまたはメインUIが表示されることを確認
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('ConfigDocロゴとタイトルが表示される', async ({ page }) => {
    await page.goto('/');

    // ConfigDocタイトル
    const title = page.locator('h1').filter({ hasText: 'ConfigDoc' });
    await expect(title).toBeVisible();

    // サブタイトル
    const subtitle = page.getByText('Configuration Documentation Tool');
    await expect(subtitle).toBeVisible();
  });

  test('初期状態で「ファイルを追加」ボタンが表示される', async ({ page }) => {
    await page.goto('/');

    // ファイル追加ボタンが表示されるまで待つ
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await expect(addButton).toBeVisible();
  });

  test('初期状態で「設定ファイル」セクションが表示される', async ({ page }) => {
    await page.goto('/');

    const sectionTitle = page.getByRole('heading', { name: '設定ファイル' });
    await expect(sectionTitle).toBeVisible();
  });

  test('初期状態でエクスポートボタンが表示される', async ({ page }) => {
    await page.goto('/');

    const exportButton = page.getByRole('button', { name: /エクスポート/ });
    await expect(exportButton).toBeVisible();
  });

  test('設定ファイルがない場合のプレースホルダーが表示される', async ({ page }) => {
    await page.goto('/');

    // 設定ファイルが読み込まれていない場合のメッセージ
    const placeholder = page.getByText('設定ファイルを選択してください');
    await expect(placeholder).toBeVisible();
  });
});
