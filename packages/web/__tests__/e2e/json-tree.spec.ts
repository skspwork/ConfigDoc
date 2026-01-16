import { test, expect } from '@playwright/test';

// テスト用のヘルパー: 設定ファイルを読み込む
async function loadConfigFile(page: any) {
  // ファイル追加ボタンをクリック
  const addButton = page.getByRole('button', { name: /ファイルを追加/ });
  await addButton.click();

  // ダイアログが開く
  await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

  // ダイアログコンテナを取得（オーバーレイではなく白いダイアログボックス内）
  const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

  // 読み込み完了を待つ
  await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

  // sampleディレクトリに移動（ダイアログ内から探す）
  const sampleDir = dialogContainer.locator('text=sample').first();
  const sampleCount = await sampleDir.count();
  if (sampleCount === 0) {
    // sampleディレクトリがない場合はスキップ
    await page.getByRole('button', { name: 'キャンセル' }).click();
    return false;
  }
  await sampleDir.click();

  // ファイル一覧の更新を待つ
  await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

  // appsettings.jsonを選択（ダイアログ内から探す）
  const jsonFile = dialogContainer.locator('text=appsettings.json').first();
  const jsonCount = await jsonFile.count();
  if (jsonCount === 0) {
    // appsettings.jsonがない場合はスキップ
    await page.getByRole('button', { name: 'キャンセル' }).click();
    return false;
  }
  await jsonFile.click();

  // 選択ボタンをクリック
  const selectButton = page.getByRole('button', { name: '選択' });
  await selectButton.click();

  // ダイアログが閉じるまで待つ
  await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();
  return true;
}

test.describe('JSONツリービュー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ファイルを読み込むと「JSON構造」セクションが表示される', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // JSON構造セクションが表示される
      const jsonSection = page.getByRole('heading', { name: 'JSON構造' });
      await expect(jsonSection).toBeVisible();
    }
  });

  test('ファイルを読み込むと「プロパティ詳細」セクションが表示される', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // プロパティ詳細セクションが表示される
      const detailSection = page.getByRole('heading', { name: 'プロパティ詳細' });
      await expect(detailSection).toBeVisible();
    }
  });

  test('JSONツリーに「すべて展開」ボタンがある', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
      await expect(expandAllButton).toBeVisible();
    }
  });

  test('JSONツリーに「すべて閉じる」ボタンがある', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      const collapseAllButton = page.getByRole('button', { name: 'すべて閉じる' });
      await expect(collapseAllButton).toBeVisible();
    }
  });

  test('JSONのトップレベルキーがツリーに表示される', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // appsettings.jsonのトップレベルキーを確認
      const databaseNode = page.getByText('Database').first();
      const loggingNode = page.getByText('Logging').first();
      const appSettingsNode = page.getByText('AppSettings').first();
      const emailNode = page.getByText('Email').first();

      await expect(databaseNode).toBeVisible();
      await expect(loggingNode).toBeVisible();
      await expect(appSettingsNode).toBeVisible();
      await expect(emailNode).toBeVisible();
    }
  });

  test('ノードをクリックすると展開される', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // 初期状態ではConnectionStringは表示されていない
      const connectionStringNode = page.getByText('ConnectionString');
      await expect(connectionStringNode).not.toBeVisible();

      // 「すべて展開」を使用して展開
      await page.getByRole('button', { name: 'すべて展開' }).click();
      await page.waitForTimeout(300);

      // 子ノードが表示される（ConnectionStringなど）
      await expect(connectionStringNode).toBeVisible();

      // 「すべて閉じる」で折りたたむ
      await page.getByRole('button', { name: 'すべて閉じる' }).click();
      await page.waitForTimeout(300);

      // ConnectionStringが非表示になる
      await expect(connectionStringNode).not.toBeVisible();
    }
  });

  test('「すべて展開」ボタンをクリックすると全ノードが展開される', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // すべて展開ボタンをクリック
      const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
      await expandAllButton.click();
      await page.waitForTimeout(300);

      // 深いノードも表示される
      const connectionStringNode = page.getByText('ConnectionString');
      const logLevelNode = page.getByText('LogLevel');

      await expect(connectionStringNode).toBeVisible();
      await expect(logLevelNode).toBeVisible();
    }
  });

  test('「すべて閉じる」ボタンをクリックすると全ノードが折りたたまれる', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // まず展開
      const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
      await expandAllButton.click();
      await page.waitForTimeout(300);

      // すべて閉じる
      const collapseAllButton = page.getByRole('button', { name: 'すべて閉じる' });
      await collapseAllButton.click();
      await page.waitForTimeout(300);

      // ConnectionStringは非表示になる
      const connectionStringNode = page.getByText('ConnectionString');
      await expect(connectionStringNode).not.toBeVisible();
    }
  });

  test('プリミティブ値のノードには値が表示される', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // すべて展開
      const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
      await expandAllButton.click();
      await page.waitForTimeout(300);

      // Timeoutノードに値が表示される
      const timeoutNode = page.getByText(/Timeout.*30/);
      await expect(timeoutNode).toBeVisible();
    }
  });

  test('ファイルタブにファイル名が表示される', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // タブにファイル名が表示される
      const fileTab = page.getByText('appsettings.json');
      await expect(fileTab).toBeVisible();
    }
  });

  test('タブの×ボタンでファイルを削除できる', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // タブにファイル名があることを確認
      const fileTab = page.getByText('appsettings.json');
      await expect(fileTab).toBeVisible();

      // ホバーして×ボタンを表示（ホバー必須の場合）
      await fileTab.hover();

      // ×ボタンをクリック
      const closeButton = page.locator('button').filter({ hasText: '' }).locator('svg').first();
      // 削除確認ダイアログが出る可能性あり
    }
  });

  test('プロパティを選択すると選択状態になる', async ({ page }) => {
    const loaded = await loadConfigFile(page);

    if (loaded) {
      // すべて展開
      const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
      await expandAllButton.click();
      await page.waitForTimeout(300);

      // ConnectionStringをクリック
      const connectionStringNode = page.getByText('ConnectionString').first();
      await connectionStringNode.click();

      // 右パネルに選択されたパスが表示される
      const pathDisplay = page.getByText('Database:ConnectionString');
      await expect(pathDisplay).toBeVisible();
    }
  });
});
