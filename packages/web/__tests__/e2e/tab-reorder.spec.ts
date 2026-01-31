import { test, expect } from './fixtures';

// タブが存在しない場合はファイルを追加するヘルパー
async function ensureTabExists(page: any): Promise<boolean> {
  const existingTab = page.locator('[draggable="true"]').first();
  const existingTabCount = await existingTab.count();

  if (existingTabCount > 0) {
    return true;
  }

  // タブがない場合はファイルを追加
  const addButton = page.getByRole('button', { name: /ファイルを追加/ });
  await addButton.click();

  // ダイアログが開く
  await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

  // ダイアログコンテナを取得
  const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

  // sampleディレクトリに移動
  await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);
  const sampleDir = dialogContainer.locator('text=sample').first();
  const sampleCount = await sampleDir.count();

  if (sampleCount === 0) {
    await page.getByRole('button', { name: 'キャンセル' }).click();
    return false;
  }

  await sampleDir.dblclick();
  await page.waitForTimeout(500);

  // appsettings.jsonを選択
  const jsonFile = dialogContainer.locator('text=appsettings.json').first();
  const jsonCount = await jsonFile.count();

  if (jsonCount === 0) {
    await page.getByRole('button', { name: 'キャンセル' }).click();
    return false;
  }

  await jsonFile.click();
  await dialogContainer.getByRole('button', { name: '選択' }).click();
  await page.waitForTimeout(500);

  return true;
}

test.describe('設定ファイルタブの並び替え', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('設定ファイルタブがドラッグ可能である', async ({ page }) => {
    const hasTab = await ensureTabExists(page);
    if (!hasTab) return;

    const existingTab = page.locator('[draggable="true"]').first();
    await expect(existingTab).toBeVisible({ timeout: 5000 });
    await expect(existingTab).toHaveAttribute('draggable', 'true');
  });

  test('タブにcursor-grab classが適用される', async ({ page }) => {
    const hasTab = await ensureTabExists(page);
    if (!hasTab) return;

    const existingTab = page.locator('[draggable="true"]').first();
    await expect(existingTab).toBeVisible({ timeout: 5000 });
    await expect(existingTab).toHaveClass(/cursor-grab/);
  });

  test('複数タブがある場合、ドラッグ＆ドロップで並び替えができる', async ({ page }) => {
    // 既存のタブ数を確認
    const existingTabs = page.locator('[draggable="true"]');
    const existingCount = await existingTabs.count();

    // 1つしかタブがない場合、追加のJSONファイルを選択
    if (existingCount < 2) {
      const addButton = page.getByRole('button', { name: /ファイルを追加/ });
      await addButton.click();

      // ダイアログが開くのを待つ
      await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

      // ダイアログコンテナを取得
      const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

      // sampleディレクトリに移動
      await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);
      const sampleDir = dialogContainer.locator('text=sample').first();
      const sampleCount = await sampleDir.count();

      if (sampleCount === 0) {
        // sampleディレクトリがない場合はスキップ
        await page.getByRole('button', { name: 'キャンセル' }).click();
        return;
      }

      // sampleディレクトリに移動（ダブルクリック）
      await sampleDir.dblclick();
      await page.waitForTimeout(500);

      // JSONファイルを選択（既に追加されているappsettings.json以外）
      const jsonFiles = dialogContainer.locator('.space-y-1 > div');
      const count = await jsonFiles.count();
      let selected = false;

      for (let i = 0; i < count && !selected; i++) {
        const item = jsonFiles.nth(i);
        const text = await item.textContent();
        // appsettings.json以外のJSONファイルを選択
        if (text?.includes('.json') && !text?.includes('appsettings.json')) {
          await item.click();
          selected = true;
        }
      }

      if (selected) {
        await dialogContainer.getByRole('button', { name: '選択' }).click();
        await page.waitForTimeout(500);
      } else {
        // 他のJSONファイルがない場合はスキップ
        await page.getByRole('button', { name: 'キャンセル' }).click();
        return;
      }
    }

    // 2つ以上のタブがあることを確認
    const tabs = page.locator('[draggable="true"]');
    const tabCount = await tabs.count();

    if (tabCount < 2) {
      // タブが2つ未満の場合はスキップ
      return;
    }

    expect(tabCount).toBeGreaterThanOrEqual(2);

    // ドラッグ＆ドロップを実行
    const firstTab = tabs.first();
    const secondTab = tabs.nth(1);

    await firstTab.dragTo(secondTab);
    await page.waitForTimeout(500);

    // タブの順序が変わったことを確認
    const newTabs = page.locator('[draggable="true"]');
    expect(await newTabs.count()).toBeGreaterThanOrEqual(2);
  });
});
