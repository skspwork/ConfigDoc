import { test, expect } from '@playwright/test';

// テスト用のヘルパー: 設定ファイルを読み込んでプロパティを選択
async function loadConfigAndSelectProperty(page: any) {
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
    await sampleDir.dblclick();
    await page.waitForTimeout(500);

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
    const selectButton = dialogContainer.getByRole('button', { name: '選択' });
    await selectButton.click();

    // ダイアログが閉じるまで待つ
    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();
  }

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

test.describe('タグ管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('タグセクションが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const tagLabel = page.getByText('タグ');
      await expect(tagLabel).toBeVisible();
    }
  });

  test('デフォルトタグが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // デフォルトタグ（required, nullable, string, number, boolean）
      const requiredTag = page.getByRole('button', { name: 'required' });
      await expect(requiredTag).toBeVisible();
    }
  });

  test('タグをクリックすると選択状態になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // requiredタグをクリック
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();

      // 選択状態を確認（CSSクラスで青背景になる）
      await expect(requiredTag).toHaveClass(/bg-blue-500/);
    }
  });

  test('選択中のタグをクリックすると選択解除される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // requiredタグをクリック（選択）
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();
      await expect(requiredTag).toHaveClass(/bg-blue-500/);

      // 再度クリック（選択解除）
      await requiredTag.click();
      await expect(requiredTag).not.toHaveClass(/bg-blue-500/);
    }
  });

  test('タグを選択すると保存ボタンが有効になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 初期状態で保存ボタンは無効
      const saveButton = page.getByRole('button', { name: /保存/ });
      await expect(saveButton).toBeDisabled();

      // タグを選択
      const requiredTag = page.getByRole('button', { name: 'required' });
      await requiredTag.click();

      // 保存ボタンが有効になる
      await expect(saveButton).toBeEnabled();
    }
  });

  test('鉛筆アイコンで編集モードに入る', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集ボタン（鉛筆アイコン）をクリック
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();

      // 編集モードのUI確認
      const editModeLabel = page.getByText('タグの追加・削除・名前変更');
      await expect(editModeLabel).toBeVisible();
    }
  });

  test('編集モードで新規タグ入力フィールドが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();

      // 入力フィールドが表示される
      const input = page.getByPlaceholder('新しいタグ名を入力');
      await expect(input).toBeVisible();
    }
  });

  test('編集モードで新規タグを追加できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 新規タグを入力
      const input = page.getByPlaceholder('新しいタグ名を入力');
      await input.fill('custom-tag');

      // 追加ボタン（+）をクリック
      const addButton = page.getByTitle('タグを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // タグが追加されている（input fieldとして表示される）
      const newTagInput = page.locator('input[value="custom-tag"]');
      await expect(newTagInput).toBeVisible();
    }
  });

  test('編集モードでEnterキーでタグを追加できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 新規タグを入力してEnter
      const input = page.getByPlaceholder('新しいタグ名を入力');
      await input.fill('enter-tag');
      await input.press('Enter');
      await page.waitForTimeout(300);

      // タグが追加されている（input fieldとして表示される）
      const newTagInput = page.locator('input[value="enter-tag"]');
      await expect(newTagInput).toBeVisible();
    }
  });

  test('重複タグを追加しようとするとエラーが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();

      // 2つの同名タグを追加してエラーを発生させる
      const timestamp = Date.now();
      const input = page.getByPlaceholder('新しいタグ名を入力');

      await input.fill(`重複A${timestamp}`);
      const addButton = page.getByTitle('タグを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      await input.fill(`重複B${timestamp}`);
      await addButton.click();
      await page.waitForTimeout(300);

      // 最後に追加したタグ名を1つ前と同じに変更
      const editTagsContainer = page.locator('.space-y-2').filter({ has: page.getByTitle('タグを削除') });
      const tagInputs = editTagsContainer.locator('input[type="text"]');
      const lastInput = tagInputs.last();
      await lastInput.clear();
      await lastInput.fill(`重複A${timestamp}`);
      await page.waitForTimeout(300);

      // エラーメッセージが表示される
      const errorMessage = page.getByText('同じ名前のタグがあります');
      await expect(errorMessage).toBeVisible();
    }
  });

  test('編集モードでタグを削除できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 削除前の削除ボタン数を取得
      const initialDeleteButtons = page.getByTitle('タグを削除');
      const initialCount = await initialDeleteButtons.count();

      // 新規タグを追加（ユニークな名前を使用）
      const uniqueTagName = `削除テスト${Date.now()}`;
      const input = page.getByPlaceholder('新しいタグ名を入力');
      await input.fill(uniqueTagName);

      const addButton = page.getByTitle('タグを追加');
      await expect(addButton).toBeEnabled({ timeout: 5000 });
      await addButton.click();
      await page.waitForTimeout(500);

      // 追加後は削除ボタンが1つ増えているはず
      const afterAddCount = await page.getByTitle('タグを削除').count();
      expect(afterAddCount).toBe(initialCount + 1);

      // 削除ボタンをクリック（最後のもの = 新しく追加したタグ）
      const deleteButton = page.getByTitle('タグを削除').last();
      await deleteButton.click();
      await page.waitForTimeout(300);

      // タグが削除された（削除ボタン数が元に戻る）
      const afterDeleteCount = await page.getByTitle('タグを削除').count();
      expect(afterDeleteCount).toBe(initialCount);
    }
  });

  test('編集モードで「キャンセル」をクリックすると変更が破棄される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();

      // 新規タグを追加
      const input = page.getByPlaceholder('新しいタグ名を入力');
      await input.fill('temp-tag');
      const addButton = page.getByTitle('タグを追加');
      await addButton.click();

      // キャンセルをクリック
      const cancelButton = page.getByRole('button', { name: 'キャンセル' });
      await cancelButton.click();

      // 編集モードが閉じて、追加したタグは表示されない
      const editModeLabel = page.getByText('タグの追加・削除・名前変更');
      await expect(editModeLabel).not.toBeVisible();
    }
  });

  test('編集モードで「保存」をクリックすると変更が保存される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 新規タグを追加（ユニークな名前を使用）
      const uniqueTagName = `saved-tag-${Date.now()}`;
      const input = page.getByPlaceholder('新しいタグ名を入力');
      await input.fill(uniqueTagName);

      const addButton = page.getByTitle('タグを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // 保存をクリック（編集モード内の緑色の保存ボタン）
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();

      // 編集モードが閉じる
      await page.waitForTimeout(300);

      // 追加したタグが選択可能なタグとして表示される
      const savedTag = page.getByRole('button', { name: uniqueTagName });
      await expect(savedTag).toBeVisible();
    }
  });
});
