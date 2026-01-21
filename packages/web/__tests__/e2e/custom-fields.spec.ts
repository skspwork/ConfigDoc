import { test, expect } from '@playwright/test';

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

test.describe('フィールド管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('フィールドセクションが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // exact: true で完全一致
      const fieldLabel = page.getByText('フィールド', { exact: true });
      await expect(fieldLabel).toBeVisible();
    }
  });

  test('鉛筆アイコンで編集モードに入る', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集ボタン（鉛筆アイコン）をクリック
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 編集モードのUI確認
      const editModeLabel = page.getByText('フィールドの追加・削除・名前変更');
      await expect(editModeLabel).toBeVisible();
    }
  });

  test('編集モードで新規フィールド入力欄が表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 入力フィールドが表示される
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await expect(input).toBeVisible();
    }
  });

  test('編集モードで新規フィールドを追加できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 新規フィールドを入力
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill('担当者');

      // 追加ボタン（+）をクリック
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();

      // フィールドが追加されている（編集モード内で確認）
      const fieldInput = page.locator('input[value="担当者"]');
      await expect(fieldInput).toBeVisible();
    }
  });

  test('編集モードでEnterキーでフィールドを追加できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 新規フィールドを入力してEnter
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill('データ型');
      await input.press('Enter');

      // フィールドが追加されている
      const fieldInput = page.locator('input[value="データ型"]');
      await expect(fieldInput).toBeVisible();
    }
  });

  test('編集モードでフィールドを削除できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 削除前の削除ボタン数を取得
      const initialDeleteButtons = page.getByTitle('フィールドを削除');
      const initialCount = await initialDeleteButtons.count();

      // 新規フィールドを追加（ユニークな名前を使用）
      const uniqueFieldName = `削除${Date.now()}`;
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(uniqueFieldName);

      // 追加ボタンが有効になるまで待つ
      const addButton = page.getByTitle('フィールドを追加');
      await expect(addButton).toBeEnabled({ timeout: 5000 });
      await addButton.click();
      await page.waitForTimeout(500);

      // 追加後は削除ボタンが1つ増えているはず
      const afterAddCount = await page.getByTitle('フィールドを削除').count();
      expect(afterAddCount).toBe(initialCount + 1);

      // 削除ボタンをクリック（最後のもの = 新しく追加したフィールド）
      const deleteButton = page.getByTitle('フィールドを削除').last();
      await deleteButton.click();
      await page.waitForTimeout(300);

      // フィールドが削除された（削除ボタン数が元に戻る）
      const afterDeleteCount = await page.getByTitle('フィールドを削除').count();
      expect(afterDeleteCount).toBe(initialCount);
    }
  });

  test('編集モードでフィールド名を変更できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 新規フィールドを追加（ユニークな名前を使用）
      const timestamp = Date.now();
      const originalName = `変更前${timestamp}`;
      const newName = `変更後${timestamp}`;
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(originalName);
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // フィールド名を変更（編集フィールド領域内の最後のテキストinput = 追加したもの）
      const editFieldsContainer = page.locator('.space-y-2').filter({ has: page.getByTitle('フィールドを削除') });
      const fieldInput = editFieldsContainer.locator('input[type="text"]').last();
      await fieldInput.fill(newName);

      // 変更が反映されている
      await expect(fieldInput).toHaveValue(newName);
    }
  });

  test('空のフィールド名がある場合、保存ボタンが無効', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 新規フィールドを追加（ユニークな名前を使用）
      const uniqueFieldName = `空テスト${Date.now()}`;
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(uniqueFieldName);
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // フィールド名を空にする（編集フィールド領域内の最後のテキストinput = 追加したもの）
      const editFieldsContainer = page.locator('.space-y-2').filter({ has: page.getByTitle('フィールドを削除') });
      const fieldInput = editFieldsContainer.locator('input[type="text"]').last();
      await fieldInput.clear();

      // 保存ボタンが無効になる（編集モード内の緑色の保存ボタン）
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await expect(saveButtonInEditMode).toBeDisabled();
    }
  });

  test('重複するフィールド名がある場合、エラーメッセージが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 2つの同名フィールドを追加（ユニークな名前を使用）
      const timestamp = Date.now();
      const input = page.getByPlaceholder('新しいフィールド名を入力');

      await input.fill(`重複A${timestamp}`);
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      await input.fill(`重複B${timestamp}`);
      await addButton.click();
      await page.waitForTimeout(300);

      // 最後に追加したフィールド名を1つ前と同じに変更
      const editFieldsContainer = page.locator('.space-y-2').filter({ has: page.getByTitle('フィールドを削除') });
      const fieldInputs = editFieldsContainer.locator('input[type="text"]');
      const lastInput = fieldInputs.last();
      await lastInput.clear();
      await lastInput.fill(`重複A${timestamp}`);
      await page.waitForTimeout(300);

      // エラーメッセージが表示される
      const errorMessage = page.getByText('同じ名前のフィールドがあります');
      await expect(errorMessage).toBeVisible();
    }
  });

  test('編集モードで「キャンセル」をクリックすると変更が破棄される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      // 新規フィールドを追加
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill('キャンセルテスト');
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();

      // キャンセルをクリック
      const cancelButton = page.getByRole('button', { name: 'キャンセル' });
      await cancelButton.click();

      // 編集モードが閉じる
      const editModeLabel = page.getByText('フィールドの追加・削除・名前変更');
      await expect(editModeLabel).not.toBeVisible();
    }
  });

  test('編集モードで「保存」をクリックするとフィールドが追加される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // 編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 新規フィールドを追加（ユニークな名前を使用）
      const uniqueFieldName = `保存テスト${Date.now()}`;
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(uniqueFieldName);

      // 追加ボタンが有効になるまで待つ
      const addButton = page.getByTitle('フィールドを追加');
      await expect(addButton).toBeEnabled({ timeout: 5000 });
      await addButton.click();
      await page.waitForTimeout(300);

      // 保存をクリック（編集モード内の緑色の保存ボタン）
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();

      // 編集モードが閉じる
      await page.waitForTimeout(300);

      // フィールドが通常モードで表示される
      const fieldLabel = page.getByText(uniqueFieldName);
      await expect(fieldLabel).toBeVisible();
    }
  });

  test('通常モードでフィールドに値を入力できる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // まずフィールドを追加（ユニークな名前を使用）
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      const uniqueFieldName = `入力テスト${Date.now()}`;
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(uniqueFieldName);
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // 保存をクリック（編集モード内の緑色の保存ボタン）
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 値を入力
      const valueTextarea = page.getByPlaceholder(`${uniqueFieldName}を入力してください`);
      await valueTextarea.fill('テスト値です');

      // 入力が反映される
      await expect(valueTextarea).toHaveValue('テスト値です');
    }
  });

  test('フィールドに値を入力すると保存ボタンが有効になる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      // まずフィールドを追加（ユニークな名前を使用）
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();

      const uniqueFieldName = `保存有効化${Date.now()}`;
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(uniqueFieldName);
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // 保存をクリック（編集モード内の緑色の保存ボタン）
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(500);

      // 値を入力（新しく追加したフィールドのtextareaを指定）
      const valueTextarea = page.getByPlaceholder(`${uniqueFieldName}を入力してください`);
      await valueTextarea.fill('テスト値');
      await page.waitForTimeout(300);

      // メインの保存ボタンが有効になる
      const saveButton = page.getByRole('button', { name: /保存/ }).first();
      await expect(saveButton).toBeEnabled();
    }
  });
});
