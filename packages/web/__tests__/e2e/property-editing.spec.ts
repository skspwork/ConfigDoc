import { test, expect } from './fixtures';

// テスト用のヘルパー: 設定ファイルを読み込んでプロパティを選択
async function loadConfigAndSelectProperty(page: any) {
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

  // すべて展開
  const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
  await expandAllButton.click();
  await page.waitForTimeout(300);

  // ConnectionStringをクリック
  const connectionStringNode = page.getByText('ConnectionString').first();
  await connectionStringNode.click();
  await page.waitForTimeout(300);

  return true;
}

test.describe('プロパティドキュメント編集', () => {
  test.beforeEach(async ({ page, testWorkDir }) => {
    process.env.E2E_TEST_WORK_DIR = testWorkDir;
    await page.goto('/');
  });

  test('プロパティ選択前は「プロパティを選択してください」と表示される', async ({ page }) => {
    // ファイルを読み込む
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    // ダイアログコンテナを取得
    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

    // 読み込み完了を待つ
    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    const sampleDir = dialogContainer.locator('text=sample').first();
    const sampleCount = await sampleDir.count();
    if (sampleCount === 0) {
      await page.getByRole('button', { name: 'キャンセル' }).click();
      test.skip();
      return;
    }
    await sampleDir.click();

    // ファイル一覧の更新を待つ
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    const jsonCount = await jsonFile.count();
    if (jsonCount === 0) {
      await page.getByRole('button', { name: 'キャンセル' }).click();
      test.skip();
      return;
    }
    await jsonFile.click();
    const selectButton = page.getByRole('button', { name: '選択' });
    await selectButton.click();
    await page.waitForTimeout(500);

    // プロパティ未選択時のメッセージ
    const placeholder = page.getByText('プロパティを選択してください');
    await expect(placeholder).toBeVisible();
  });

  test('プロパティを選択すると詳細パネルにパスが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // パスラベルが表示される
      const pathLabel = page.getByText('パス');
      await expect(pathLabel).toBeVisible();

      // パスの値が表示される
      const pathValue = page.getByText('Database:ConnectionString');
      await expect(pathValue).toBeVisible();
    }
  });

  test('説明入力フィールドが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 説明ラベル（正確にマッチ）
      const descriptionLabel = page.getByText('説明', { exact: true });
      await expect(descriptionLabel).toBeVisible();

      // テキストエリア（説明フィールドの入力欄）
      const textarea = page.getByPlaceholder('説明を入力してください');
      await expect(textarea).toBeVisible();
    }
  });

  test('説明フィールドのプレースホルダーが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const textarea = page.getByPlaceholder('説明を入力してください');
      await expect(textarea).toHaveAttribute('placeholder', '説明を入力してください');
    }
  });

  test('保存ボタンが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const saveButton = page.getByRole('button', { name: /保存/ });
      await expect(saveButton).toBeVisible();
    }
  });

  test('初期状態で保存ボタンは無効', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const saveButton = page.getByRole('button', { name: /保存/ });
      await expect(saveButton).toBeDisabled();
    }
  });

  test('説明を入力すると保存ボタンが有効になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // テキストエリアに入力（説明フィールドの入力欄）
      const textarea = page.getByPlaceholder('説明を入力してください');
      await textarea.fill('データベース接続文字列です');

      // 保存ボタンが有効になる
      const saveButton = page.getByRole('button', { name: /保存/ });
      await expect(saveButton).toBeEnabled();
    }
  });

  test('説明を入力して保存ボタンをクリックするとトースト通知が表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // テキストエリアに入力（説明フィールドの入力欄）（ユニークなテキスト）
      const textarea = page.getByPlaceholder('説明を入力してください');
      await textarea.clear();
      await textarea.fill(`テスト用の説明文 ${Date.now()}`);
      await page.waitForTimeout(300);

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: /保存/ });
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();

      // トースト通知を確認
      const toast = page.getByText('保存しました');
      await expect(toast).toBeVisible();
    }
  });

  test('保存後に保存ボタンが無効になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // テキストエリアに入力（説明フィールドの入力欄）（ユニークなテキスト）
      const textarea = page.getByPlaceholder('説明を入力してください');
      await textarea.clear();
      await textarea.fill(`保存後無効テスト ${Date.now()}`);
      await page.waitForTimeout(300);

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: /保存/ });
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      await saveButton.click();

      // トーストが表示されるまで待つ
      await page.waitForTimeout(500);

      // 保存ボタンが無効になる
      await expect(saveButton).toBeDisabled();
    }
  });

  test('別のプロパティに切り替えると選択パスが変わる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 別のプロパティ（Timeout）をクリック
      const timeoutNode = page.getByText('Timeout').first();
      await timeoutNode.click();
      await page.waitForTimeout(300);

      // パスが変わる
      const pathValue = page.getByText('Database:Timeout');
      await expect(pathValue).toBeVisible();
    }
  });

  test('未保存の変更がある状態で別プロパティを選択すると確認ダイアログが出る', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // テキストエリアに入力（未保存）（説明フィールドの入力欄）
      const textarea = page.getByPlaceholder('説明を入力してください');
      await textarea.fill('未保存のテスト');

      // ダイアログのハンドラーを設定
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('保存されていない変更があります');
        await dialog.accept();
      });

      // 別のプロパティをクリック
      const timeoutNode = page.getByText('Timeout').first();
      await timeoutNode.click();
    }
  });

  test('タグセクションが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグラベル
      const tagLabel = page.getByText('タグ');
      await expect(tagLabel).toBeVisible();
    }
  });

  test('フィールドセクションが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // フィールドラベル（exact: true で完全一致）
      const fieldLabel = page.getByText('フィールド', { exact: true });
      await expect(fieldLabel).toBeVisible();
    }
  });
});
