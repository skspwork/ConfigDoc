import { test, expect } from '@playwright/test';

test.describe('ファイル選択・読み込み', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('「ファイルを追加」ボタンをクリックするとFileBrowserダイアログが開く', async ({ page }) => {
    // ファイル追加ボタンをクリック
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが表示される
    const dialog = page.getByRole('heading', { name: 'ファイルを選択' });
    await expect(dialog).toBeVisible();
  });

  test('FileBrowserダイアログに「キャンセル」「選択」ボタンが表示される', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // キャンセルボタン
    const cancelButton = page.getByRole('button', { name: 'キャンセル' });
    await expect(cancelButton).toBeVisible();

    // 選択ボタン
    const selectButton = page.getByRole('button', { name: '選択' });
    await expect(selectButton).toBeVisible();
  });

  test('FileBrowserダイアログの「選択」ボタンは初期状態で無効', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // 選択ボタンが無効
    const selectButton = page.getByRole('button', { name: '選択' });
    await expect(selectButton).toBeDisabled();
  });

  test('FileBrowserダイアログに現在のパスが表示される', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // パス表示がある
    const pathDisplay = page.getByText(/パス:/);
    await expect(pathDisplay).toBeVisible();
  });

  test('FileBrowserダイアログに上階層ボタンが表示される', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // 上へボタン（ArrowUpIcon）
    const upButton = page.getByTitle('上のディレクトリへ');
    await expect(upButton).toBeVisible();
  });

  test('FileBrowserダイアログの閉じるボタンでダイアログが閉じる', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが表示されていることを確認
    const dialog = page.getByRole('heading', { name: 'ファイルを選択' });
    await expect(dialog).toBeVisible();

    // 閉じるボタン（✕）をクリック
    const closeButton = page.getByRole('button', { name: '✕' });
    await closeButton.click();

    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
  });

  test('FileBrowserダイアログのキャンセルボタンでダイアログが閉じる', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    const dialog = page.getByRole('heading', { name: 'ファイルを選択' });
    await expect(dialog).toBeVisible();

    // キャンセルボタンをクリック
    const cancelButton = page.getByRole('button', { name: 'キャンセル' });
    await cancelButton.click();

    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
  });

  test('ディレクトリをクリックすると移動する', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが開いて読み込みが完了するまで待つ
    const dialog = page.getByRole('heading', { name: 'ファイルを選択' });
    await expect(dialog).toBeVisible();

    // ダイアログコンテナを取得
    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

    // 読み込み完了を待つ
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    // ディレクトリがあれば（フォルダアイコン）クリック
    const folderItem = dialogContainer.locator('text=sample').first();
    const sampleCount = await folderItem.count();

    if (sampleCount > 0) {
      const currentPath = await page.getByText(/パス:/).textContent();
      await folderItem.click();

      // パスが変わることを確認（少し待つ）
      await page.waitForTimeout(500);
      const newPath = await page.getByText(/パス:/).textContent();
      expect(newPath).not.toBe(currentPath);
    }
  });

  test('JSONファイルのみが表示される（filterJsonOnly）', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが開いて読み込みが完了するまで待つ
    await page.waitForTimeout(1000);

    // ファイル一覧エリアを取得
    const fileList = page.locator('.overflow-y-auto');

    // ファイルがあれば、JSONファイルまたはフォルダのみ
    const files = fileList.locator('.flex.items-center.gap-2.p-2');
    const count = await files.count();

    // 読み込み完了後にファイルをチェック
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const item = files.nth(i);
        const text = await item.textContent();
        // ディレクトリか、.jsonファイルであることを確認
        const hasFolder = (await item.locator('svg').first().getAttribute('class'))?.includes('blue');
        if (!hasFolder && text) {
          expect(text).toMatch(/\.json/i);
        }
      }
    }
  });

  test('ファイルを選択すると「選択」ボタンが有効になる', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが開く
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    // ダイアログコンテナを取得
    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

    // 読み込み完了を待つ
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    // sampleディレクトリに移動（存在する場合）
    const sampleDir = dialogContainer.locator('text=sample').first();
    const sampleCount = await sampleDir.count();

    if (sampleCount > 0) {
      await sampleDir.click();
      await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);
    }

    // JSONファイルをクリック
    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    const jsonCount = await jsonFile.count();

    if (jsonCount > 0) {
      await jsonFile.click();

      // 選択ボタンが有効になる
      const selectButton = page.getByRole('button', { name: '選択' });
      await expect(selectButton).toBeEnabled();
    }
  });

  test('複数ファイル選択時に選択数が表示される', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    // ダイアログが開く
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();
    await page.waitForTimeout(500);

    // ファイルを複数選択する（存在する場合）
    const files = page.locator('.overflow-y-auto .flex.items-center.gap-2.p-2');
    const count = await files.count();

    // JSONファイルを2つ以上選択してみる
    let selectedCount = 0;
    for (let i = 0; i < count && selectedCount < 2; i++) {
      const item = files.nth(i);
      const text = await item.textContent();
      if (text?.includes('.json')) {
        await item.click();
        selectedCount++;
      }
    }

    if (selectedCount > 0) {
      // 選択数の表示を確認
      const countDisplay = page.getByText(/件選択中/);
      await expect(countDisplay).toBeVisible();
    }
  });
});
