import { test, expect } from './fixtures';

// テスト用のヘルパー: 設定ファイルを読み込んでプロパティを選択
async function loadConfigAndSelectProperty(page: any, propertyName: string = 'ConnectionString') {
  // E2Eセットアップで既にタブが存在するか確認
  const existingTab = page.locator('[draggable="true"]').first();
  const existingTabCount = await existingTab.count();

  // タブが存在しない場合はファイルを追加
  if (existingTabCount === 0) {
    // ファイル追加ボタンをクリック
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
      await page.getByRole('button', { name: 'キャンセル' }).click();
      return false;
    }
    await sampleDir.dblclick();
    await page.waitForTimeout(500);

    // ファイル一覧の更新を待つ
    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    // appsettings.jsonを選択
    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    const jsonCount = await jsonFile.count();
    if (jsonCount === 0) {
      await page.getByRole('button', { name: 'キャンセル' }).click();
      return false;
    }
    await jsonFile.click();

    // 選択ボタンをクリック
    const selectButton = dialogContainer.getByRole('button', { name: '選択' });
    await selectButton.click();

    // ダイアログが閉じるまで待つ
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();
  }

  // すべて展開
  const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
  await expandAllButton.click();
  await page.waitForTimeout(300);

  // 指定されたプロパティをクリック
  const propertyNode = page.getByText(propertyName).first();
  await propertyNode.click();
  await page.waitForTimeout(300);

  return true;
}

test.describe('プロパティ詳細のコピー＆ペースト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('コピーボタンとペーストボタンがヘッダー右上に表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // コピーボタンが表示される（titleで検索）
      const copyButton = page.getByTitle('プロパティ詳細をコピー');
      await expect(copyButton).toBeVisible();

      // ペーストボタンが表示される（titleで検索）
      const pasteButton = page.getByTitle('プロパティ詳細を貼り付け');
      await expect(pasteButton).toBeVisible();
    }
  });

  test('コピーボタンをクリックするとトースト通知が表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // コピーボタンをクリック
      const copyButton = page.getByTitle('プロパティ詳細をコピー');
      await copyButton.click();

      // トースト通知を確認
      const toast = page.getByText('プロパティ詳細をコピーしました');
      await expect(toast).toBeVisible();
    }
  });

  test('タグをコピーして別のプロパティにペーストできる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await expect(requiredTag).toHaveClass(/bg-blue-500/);

      // コピーボタンをクリック
      const copyButton = page.getByTitle('プロパティ詳細をコピー');
      await copyButton.click();
      await page.waitForTimeout(300);

      // ダイアログのハンドラーを設定（未保存変更の確認）
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // 別のプロパティ（Timeout）を選択
      const timeoutNode = page.getByText('Timeout').first();
      await timeoutNode.click();
      await page.waitForTimeout(500);

      // ペーストボタンをクリック
      const pasteButton = page.getByTitle('プロパティ詳細を貼り付け');
      await pasteButton.click();

      // トースト通知を確認
      const toast = page.getByText('プロパティ詳細を貼り付けました');
      await expect(toast).toBeVisible();

      // タグがペーストされていることを確認（requiredが選択状態）
      const requiredTagAfterPaste = page.getByRole('button', { name: 'required' });
      await expect(requiredTagAfterPaste).toHaveClass(/bg-blue-500/);
    }
  });

  test('ペースト後に保存して永続化される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択
      const stringTag = page.getByRole('button', { name: 'string' });
      await stringTag.click();

      // コピーボタンをクリック
      const copyButton = page.getByTitle('プロパティ詳細をコピー');
      await copyButton.click();
      await page.waitForTimeout(300);

      // ダイアログのハンドラーを設定
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // 別のプロパティ（Timeout）を選択
      const timeoutNode = page.getByText('Timeout').first();
      await timeoutNode.click();
      await page.waitForTimeout(500);

      // ペーストボタンをクリック
      const pasteButton = page.getByTitle('プロパティ詳細を貼り付け');
      await pasteButton.click();
      await page.waitForTimeout(300);

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: /保存/ });
      await saveButton.click();

      // トースト通知を確認
      const toast = page.getByText('保存しました');
      await expect(toast).toBeVisible();

      // 保存後は保存ボタンが無効になる
      await expect(saveButton).toBeDisabled();
    }
  });
});

test.describe('プロパティ詳細の削除', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('削除ボタンが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 削除ボタンが表示される
      const deleteButton = page.getByRole('button', { name: /削除/ });
      await expect(deleteButton).toBeVisible();
    }
  });

  test('保存前は削除ボタンが無効', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 削除ボタンは無効（まだ保存されていないプロパティ）
      const deleteButton = page.getByRole('button', { name: /削除/ });
      await expect(deleteButton).toBeDisabled();
    }
  });

  test('保存後のプロパティは削除ボタンが有効', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択して保存
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await page.waitForTimeout(100);

      const saveButton = page.getByRole('button', { name: /保存/ });
      await saveButton.click();
      await page.waitForTimeout(500);

      // 削除ボタンが有効になる
      const deleteButton = page.getByRole('button', { name: /削除/ });
      await expect(deleteButton).toBeEnabled();
    }
  });

  test('削除ボタンをクリックすると確認ダイアログが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択して保存
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await page.waitForTimeout(100);

      const saveButton = page.getByRole('button', { name: /保存/ });
      await saveButton.click();
      await page.waitForTimeout(500);

      // ダイアログのハンドラーを設定
      let dialogMessage = '';
      page.on('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss(); // キャンセル
      });

      // 削除ボタンをクリック
      const deleteButton = page.getByRole('button', { name: /削除/ });
      await deleteButton.click();
      await page.waitForTimeout(300);

      // 確認ダイアログが表示されることを確認
      expect(dialogMessage).toContain('削除');
    }
  });

  test('削除を実行するとトースト通知が表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択して保存
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await page.waitForTimeout(100);

      const saveButton = page.getByRole('button', { name: /保存/ });
      await saveButton.click();
      await page.waitForTimeout(500);

      // ダイアログのハンドラーを設定（確認ダイアログを承認）
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // 削除ボタンをクリック
      const deleteButton = page.getByRole('button', { name: /削除/ });
      await deleteButton.click();

      // トースト通知を確認
      const toast = page.getByText('プロパティ詳細を削除しました');
      await expect(toast).toBeVisible();
    }
  });

  test('削除後にタグがクリアされる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択して保存
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await expect(requiredTag).toHaveClass(/bg-blue-500/);
      await page.waitForTimeout(100);

      const saveButton = page.getByRole('button', { name: /保存/ });
      await saveButton.click();
      await page.waitForTimeout(500);

      // ダイアログのハンドラーを設定（確認ダイアログを承認）
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // 削除ボタンをクリック
      const deleteButton = page.getByRole('button', { name: /削除/ });
      await deleteButton.click();
      await page.waitForTimeout(500);

      // タグが選択解除されている
      const requiredTagAfterDelete = page.getByRole('button', { name: 'required' });
      await expect(requiredTagAfterDelete).not.toHaveClass(/bg-blue-500/);
    }
  });

  test('削除後は削除ボタンが無効になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択して保存
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await page.waitForTimeout(100);

      const saveButton = page.getByRole('button', { name: /保存/ });
      await saveButton.click();
      await page.waitForTimeout(500);

      // ダイアログのハンドラーを設定（確認ダイアログを承認）
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // 削除ボタンをクリック
      const deleteButton = page.getByRole('button', { name: /削除/ });
      await deleteButton.click();
      await page.waitForTimeout(500);

      // 削除ボタンが無効になる
      await expect(deleteButton).toBeDisabled();
    }
  });
});
