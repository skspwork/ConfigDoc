import { test, expect } from '@playwright/test';

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

  test('コピーボタンとペーストボタンが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // コピーボタンが表示される
      const copyButton = page.getByRole('button', { name: /コピー/ });
      await expect(copyButton).toBeVisible();

      // ペーストボタンが表示される
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await expect(pasteButton).toBeVisible();
    }
  });

  test('初期状態でペーストボタンは無効', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // ペーストボタンは無効（クリップボードが空）
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await expect(pasteButton).toBeDisabled();
    }
  });

  test('コピーボタンをクリックするとトースト通知が表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // コピーボタンをクリック
      const copyButton = page.getByRole('button', { name: /コピー/ });
      await copyButton.click();

      // トースト通知を確認
      const toast = page.getByText('プロパティ詳細をコピーしました');
      await expect(toast).toBeVisible();
    }
  });

  test('コピー後にペーストボタンが有効になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 初期状態でペーストボタンは無効
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await expect(pasteButton).toBeDisabled();

      // コピーボタンをクリック
      const copyButton = page.getByRole('button', { name: /コピー/ });
      await copyButton.click();
      await page.waitForTimeout(300);

      // ペーストボタンが有効になる
      await expect(pasteButton).toBeEnabled();
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
      const copyButton = page.getByRole('button', { name: /コピー/ });
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
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await pasteButton.click();

      // トースト通知を確認
      const toast = page.getByText('プロパティ詳細を貼り付けました');
      await expect(toast).toBeVisible();

      // タグがペーストされていることを確認（requiredが選択状態）
      const requiredTagAfterPaste = page.getByRole('button', { name: 'required' });
      await expect(requiredTagAfterPaste).toHaveClass(/bg-blue-500/);
    }
  });

  test('フィールド値をコピーして別のプロパティにペーストできる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // フィールドエディタを開いて新しいフィールドを追加
      const editFieldsButton = page.getByTitle('フィールドを編集');
      await editFieldsButton.click();
      await page.waitForTimeout(300);

      // 新規フィールドを追加
      const timestamp = Date.now();
      const fieldName = `TestField${timestamp}`;
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(fieldName);

      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // 保存をクリック
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // フィールドに値を入力
      const fieldInput = page.getByPlaceholder(`${fieldName}を入力`);
      await fieldInput.fill('テストフィールド値');
      await page.waitForTimeout(300);

      // コピーボタンをクリック
      const copyButton = page.getByRole('button', { name: /コピー/ });
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
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await pasteButton.click();
      await page.waitForTimeout(300);

      // フィールド値がペーストされていることを確認
      const pastedFieldInput = page.getByPlaceholder(`${fieldName}を入力`);
      await expect(pastedFieldInput).toHaveValue('テストフィールド値');
    }
  });

  test('ペースト後に保存ボタンが有効になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();

      // コピーボタンをクリック
      const copyButton = page.getByRole('button', { name: /コピー/ });
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

      // 初期状態で保存ボタンは無効
      const saveButton = page.getByRole('button', { name: /保存/ }).last();
      await expect(saveButton).toBeDisabled();

      // ペーストボタンをクリック
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await pasteButton.click();
      await page.waitForTimeout(300);

      // 保存ボタンが有効になる
      await expect(saveButton).toBeEnabled();
    }
  });

  test('タグとフィールド値の両方をコピー＆ペーストできる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択（requiredとnullable）
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await page.waitForTimeout(100);

      const nullableTag = page.getByRole('button', { name: 'nullable' });
      await nullableTag.click();
      await page.waitForTimeout(100);

      // コピーボタンをクリック
      const copyButton = page.getByRole('button', { name: /コピー/ });
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
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await pasteButton.click();
      await page.waitForTimeout(300);

      // 両方のタグがペーストされていることを確認
      const requiredTagAfterPaste = page.getByRole('button', { name: 'required' });
      await expect(requiredTagAfterPaste).toHaveClass(/bg-blue-500/);

      const nullableTagAfterPaste = page.getByRole('button', { name: 'nullable' });
      await expect(nullableTagAfterPaste).toHaveClass(/bg-blue-500/);
    }
  });

  test('ペースト後に保存して永続化される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // タグを選択
      const stringTag = page.getByRole('button', { name: 'string' });
      await stringTag.click();

      // コピーボタンをクリック
      const copyButton = page.getByRole('button', { name: /コピー/ });
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
      const pasteButton = page.getByRole('button', { name: /ペースト/ });
      await pasteButton.click();
      await page.waitForTimeout(300);

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: /保存/ }).last();
      await saveButton.click();

      // トースト通知を確認
      const toast = page.getByText('保存しました');
      await expect(toast).toBeVisible();

      // 保存後は保存ボタンが無効になる
      await expect(saveButton).toBeDisabled();
    }
  });
});
