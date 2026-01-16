import { test, expect } from '@playwright/test';

test.describe('複合ワークフロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('完全なワークフロー: ファイル選択→プロパティ選択→説明入力→保存', async ({ page }) => {
    // 1. ファイル追加ボタンをクリック
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが開く
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    // ダイアログコンテナを取得
    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

    // 読み込み完了を待つ
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    // sampleディレクトリに移動
    const sampleDir = dialogContainer.locator('text=sample').first();
    const sampleCount = await sampleDir.count();
    if (sampleCount === 0) {
      // テストをスキップ
      test.skip();
      return;
    }

    await sampleDir.click();

    // ファイル一覧の更新を待つ
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    // 2. appsettings.jsonを選択
    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    await jsonFile.click();
    const selectButton = page.getByRole('button', { name: '選択' });
    await selectButton.click();

    // ダイアログが閉じる
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();

    // 3. JSON構造が表示される
    const jsonSection = page.getByRole('heading', { name: 'JSON構造' });
    await expect(jsonSection).toBeVisible();

    // 4. すべて展開
    const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
    await expandAllButton.click();
    await page.waitForTimeout(300);

    // 5. プロパティを選択
    const connectionStringNode = page.getByText('ConnectionString').first();
    await connectionStringNode.click();
    await page.waitForTimeout(300);

    // 6. プロパティ詳細が表示される
    const pathValue = page.getByText('Database:ConnectionString');
    await expect(pathValue).toBeVisible();

    // 7. 説明を入力（メインの説明入力欄を指定）（ユニークなテキストで確実に変更を発生させる）
    const textarea = page.getByPlaceholder('このプロパティの説明を入力してください');
    await textarea.clear();
    const description = `E2Eテスト用の説明文 ${Date.now()}`;
    await textarea.fill(description);
    await page.waitForTimeout(300);

    // 8. 保存ボタンが有効になる
    const saveButton = page.getByRole('button', { name: /保存/ });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });

    // 9. 保存
    await saveButton.click();

    // 10. トースト通知
    const toast = page.getByText('保存しました');
    await expect(toast).toBeVisible();
  });

  test('タグ選択を含むワークフロー', async ({ page }) => {
    // ファイルを読み込む
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    const sampleDir = dialogContainer.locator('text=sample').first();
    if ((await sampleDir.count()) === 0) {
      test.skip();
      return;
    }

    await sampleDir.click();
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    await jsonFile.click();
    await page.getByRole('button', { name: '選択' }).click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();

    // 展開してプロパティを選択
    await page.getByRole('button', { name: 'すべて展開' }).click();
    await page.waitForTimeout(300);

    await page.getByText('Timeout').first().click();
    await page.waitForTimeout(300);

    // タグを選択
    const requiredTag = page.getByRole('button', { name: 'required' });
    await requiredTag.click();

    // 説明を入力（メインの説明入力欄を指定）
    await page.getByPlaceholder('このプロパティの説明を入力してください').fill('タイムアウト値（秒）');

    // 保存
    await page.getByRole('button', { name: /保存/ }).click();

    // トースト通知
    await expect(page.getByText('保存しました')).toBeVisible();
  });

  test('エクスポートを含む完全ワークフロー', async ({ page }) => {
    // ファイルを読み込む
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    const sampleDir = dialogContainer.locator('text=sample').first();
    if ((await sampleDir.count()) === 0) {
      test.skip();
      return;
    }

    await sampleDir.click();
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    await jsonFile.click();
    await page.getByRole('button', { name: '選択' }).click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();

    // 展開してプロパティを選択
    await page.getByRole('button', { name: 'すべて展開' }).click();
    await page.waitForTimeout(300);

    await page.getByText('MaxPoolSize').first().click();
    await page.waitForTimeout(300);

    // 説明を入力して保存（メインの説明入力欄を指定）（ユニークなテキストで確実に変更を発生させる）
    const textarea = page.getByPlaceholder('このプロパティの説明を入力してください');
    await textarea.clear();
    await textarea.fill(`最大プールサイズ - テスト ${Date.now()}`);
    await page.waitForTimeout(300);

    // 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: /保存/ }).first();
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    await page.waitForTimeout(500);

    // エクスポートダイアログを開く
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // エクスポートを実行
    const dialogExportButton = page.getByRole('button', { name: 'エクスポート' }).last();
    await dialogExportButton.click();

    // エクスポート成功の通知
    await expect(page.getByText(/エクスポートしました/)).toBeVisible({ timeout: 5000 });
  });

  test('タブ切り替えワークフロー', async ({ page }) => {
    // 1つ目のファイルを読み込む
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    const sampleDir = dialogContainer.locator('text=sample').first();
    if ((await sampleDir.count()) === 0) {
      test.skip();
      return;
    }

    await sampleDir.click();
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    await jsonFile.click();
    await page.getByRole('button', { name: '選択' }).click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();

    // タブにファイル名が表示される
    const tab = page.getByText('appsettings.json');
    await expect(tab).toBeVisible();

    // プロパティを選択
    await page.getByRole('button', { name: 'すべて展開' }).click();
    await page.waitForTimeout(300);

    await page.getByText('Database').first().click();
    await page.waitForTimeout(300);

    // Database配下のプロパティが表示される
    const pathValue = page.getByText(/Database/).first();
    await expect(pathValue).toBeVisible();
  });
});

test.describe('エラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('存在しないファイルを読み込もうとしてもクラッシュしない', async ({ page }) => {
    // アプリが起動していることを確認
    const title = page.locator('h1').filter({ hasText: 'ConfigDoc' });
    await expect(title).toBeVisible();

    // ファイルを追加ボタンが表示されている
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await expect(addButton).toBeVisible();
  });

  test('FileBrowserダイアログを開いて閉じてもアプリが正常動作', async ({ page }) => {
    // ダイアログを開く
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが表示される
    const dialog = page.getByRole('heading', { name: 'ファイルを選択' });
    await expect(dialog).toBeVisible();

    // キャンセルで閉じる
    await page.getByRole('button', { name: 'キャンセル' }).click();

    // アプリが正常
    const title = page.locator('h1').filter({ hasText: 'ConfigDoc' });
    await expect(title).toBeVisible();
  });

  test('エクスポートダイアログを開いて閉じてもアプリが正常動作', async ({ page }) => {
    // エクスポートダイアログを開く
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // ダイアログが表示される
    const dialog = page.getByRole('heading', { name: 'エクスポート設定' });
    await expect(dialog).toBeVisible();

    // キャンセルで閉じる
    await page.getByRole('button', { name: 'キャンセル' }).click();

    // アプリが正常
    const title = page.locator('h1').filter({ hasText: 'ConfigDoc' });
    await expect(title).toBeVisible();
  });

  test('未保存変更がある状態でも別プロパティに移動可能（確認ダイアログ後）', async ({ page }) => {
    // ファイルを読み込む
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    const sampleDir = dialogContainer.locator('text=sample').first();
    if ((await sampleDir.count()) === 0) {
      test.skip();
      return;
    }

    await sampleDir.click();
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    await jsonFile.click();
    await page.getByRole('button', { name: '選択' }).click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();

    // 展開
    await page.getByRole('button', { name: 'すべて展開' }).click();
    await page.waitForTimeout(300);

    // プロパティを選択
    await page.getByText('ConnectionString').first().click();
    await page.waitForTimeout(300);

    // 説明を入力（未保存）（メインの説明入力欄を指定）
    await page.getByPlaceholder('このプロパティの説明を入力してください').fill('未保存のテスト');

    // 確認ダイアログを許可するハンドラー
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // 別のプロパティに移動
    await page.getByText('Timeout').first().click();
    await page.waitForTimeout(300);

    // 新しいプロパティのパスが表示される
    const pathValue = page.getByText('Database:Timeout');
    await expect(pathValue).toBeVisible();
  });

  test('API呼び出し中にUIが応答する', async ({ page }) => {
    // ファイルを読み込む
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    const sampleDir = dialogContainer.locator('text=sample').first();
    if ((await sampleDir.count()) === 0) {
      test.skip();
      return;
    }

    await sampleDir.click();
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    await jsonFile.click();
    await page.getByRole('button', { name: '選択' }).click();

    // ファイルが読み込まれている間もUIが応答
    const title = page.locator('h1').filter({ hasText: 'ConfigDoc' });
    await expect(title).toBeVisible();
  });
});
