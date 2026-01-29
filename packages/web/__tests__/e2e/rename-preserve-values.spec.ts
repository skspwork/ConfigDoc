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

// 編集モード内の特定の値を持つ入力フィールドを見つける
async function findInputByValue(page: any, containerTitle: string, targetValue: string) {
  const container = page.locator('.space-y-2').filter({ has: page.getByTitle(containerTitle) });
  const inputs = container.locator('input[type="text"]');
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const value = await input.inputValue();
    if (value === targetValue) {
      return input;
    }
  }
  return null;
}

test.describe('タグ名変更時の値引き継ぎ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('タグを選択後にタグ名を変更しても選択状態が維持される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const timestamp = Date.now();
      const originalTagName = `TestTag${timestamp}`;
      const renamedTagName = `RenamedTag${timestamp}`;

      // タグ編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 新規タグを追加
      const input = page.getByPlaceholder('新しいタグ名を入力');
      await input.fill(originalTagName);
      const addButton = page.getByTitle('タグを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // 編集モードの保存をクリック
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 追加したタグを選択
      const newTag = page.getByRole('button', { name: originalTagName });
      await newTag.click();
      await expect(newTag).toHaveClass(/bg-blue-500/);

      // 再度編集モードに入る
      await editButton.click();
      await page.waitForTimeout(300);

      // タグ名を変更（コンテナ内から該当の入力を探す）
      const tagInput = await findInputByValue(page, 'タグを削除', originalTagName);
      expect(tagInput).not.toBeNull();
      await tagInput!.clear();
      await tagInput!.fill(renamedTagName);
      await page.waitForTimeout(300);

      // 編集モードの保存をクリック
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 名前変更後のタグが選択状態であることを確認
      const renamedTag = page.getByRole('button', { name: renamedTagName });
      await expect(renamedTag).toBeVisible();
      await expect(renamedTag).toHaveClass(/bg-blue-500/);
    }
  });

  test('複数タグを選択後にタグ名を変更しても全ての選択状態が維持される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const timestamp = Date.now();
      const tag1Original = `Tag1_${timestamp}`;
      const tag1Renamed = `Tag1Renamed_${timestamp}`;
      const tag2Original = `Tag2_${timestamp}`;

      // タグ編集モードに入る
      const editButton = page.getByTitle('タグを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 2つの新規タグを追加
      const input = page.getByPlaceholder('新しいタグ名を入力');
      const addButton = page.getByTitle('タグを追加');

      await input.fill(tag1Original);
      await addButton.click();
      await page.waitForTimeout(200);

      await input.fill(tag2Original);
      await addButton.click();
      await page.waitForTimeout(200);

      // 編集モードの保存をクリック
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 両方のタグを選択
      const tag1 = page.getByRole('button', { name: tag1Original });
      await tag1.click();
      await expect(tag1).toHaveClass(/bg-blue-500/);

      const tag2 = page.getByRole('button', { name: tag2Original });
      await tag2.click();
      await expect(tag2).toHaveClass(/bg-blue-500/);

      // 再度編集モードに入る
      await editButton.click();
      await page.waitForTimeout(300);

      // tag1の名前を変更
      const tag1Input = await findInputByValue(page, 'タグを削除', tag1Original);
      expect(tag1Input).not.toBeNull();
      await tag1Input!.clear();
      await tag1Input!.fill(tag1Renamed);
      await page.waitForTimeout(300);

      // 編集モードの保存をクリック
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 両方のタグが選択状態であることを確認
      const tag1Renamed_ = page.getByRole('button', { name: tag1Renamed });
      await expect(tag1Renamed_).toBeVisible();
      await expect(tag1Renamed_).toHaveClass(/bg-blue-500/);

      const tag2AfterRename = page.getByRole('button', { name: tag2Original });
      await expect(tag2AfterRename).toBeVisible();
      await expect(tag2AfterRename).toHaveClass(/bg-blue-500/);
    }
  });
});

test.describe('フィールド名変更時の値引き継ぎ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('フィールドに値を入力後にフィールド名を変更しても値が維持される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const timestamp = Date.now();
      const originalFieldName = `TestField${timestamp}`;
      const renamedFieldName = `RenamedField${timestamp}`;
      const fieldValue = `テスト値_${timestamp}`;

      // フィールド編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 新規フィールドを追加
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      await input.fill(originalFieldName);
      const addButton = page.getByTitle('フィールドを追加');
      await addButton.click();
      await page.waitForTimeout(300);

      // 編集モードの保存をクリック
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // フィールドに値を入力
      const fieldInput = page.getByPlaceholder(`${originalFieldName}を入力`);
      await fieldInput.fill(fieldValue);
      await page.waitForTimeout(300);

      // 再度フィールド編集モードに入る
      await editButton.click();
      await page.waitForTimeout(300);

      // フィールド名を変更
      const fieldNameInput = await findInputByValue(page, 'フィールドを削除', originalFieldName);
      expect(fieldNameInput).not.toBeNull();
      await fieldNameInput!.clear();
      await fieldNameInput!.fill(renamedFieldName);
      await page.waitForTimeout(300);

      // 編集モードの保存をクリック
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 名前変更後のフィールドに値が維持されていることを確認
      const renamedFieldInput = page.getByPlaceholder(`${renamedFieldName}を入力`);
      await expect(renamedFieldInput).toBeVisible();
      await expect(renamedFieldInput).toHaveValue(fieldValue);
    }
  });

  test('複数フィールドに値を入力後にフィールド名を変更しても全ての値が維持される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const timestamp = Date.now();
      const field1Original = `Field1_${timestamp}`;
      const field1Renamed = `Field1Renamed_${timestamp}`;
      const field2Original = `Field2_${timestamp}`;
      const field1Value = `値1_${timestamp}`;
      const field2Value = `値2_${timestamp}`;

      // フィールド編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 2つの新規フィールドを追加
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      const addButton = page.getByTitle('フィールドを追加');

      await input.fill(field1Original);
      await addButton.click();
      await page.waitForTimeout(200);

      await input.fill(field2Original);
      await addButton.click();
      await page.waitForTimeout(200);

      // 編集モードの保存をクリック
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 両方のフィールドに値を入力
      const field1Input = page.getByPlaceholder(`${field1Original}を入力`);
      await field1Input.fill(field1Value);
      await page.waitForTimeout(100);

      const field2Input = page.getByPlaceholder(`${field2Original}を入力`);
      await field2Input.fill(field2Value);
      await page.waitForTimeout(100);

      // 再度フィールド編集モードに入る
      await editButton.click();
      await page.waitForTimeout(300);

      // field1の名前を変更
      const field1NameInput = await findInputByValue(page, 'フィールドを削除', field1Original);
      expect(field1NameInput).not.toBeNull();
      await field1NameInput!.clear();
      await field1NameInput!.fill(field1Renamed);
      await page.waitForTimeout(300);

      // 編集モードの保存をクリック
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 両方のフィールドに値が維持されていることを確認
      const field1RenamedInput = page.getByPlaceholder(`${field1Renamed}を入力`);
      await expect(field1RenamedInput).toBeVisible();
      await expect(field1RenamedInput).toHaveValue(field1Value);

      const field2AfterRename = page.getByPlaceholder(`${field2Original}を入力`);
      await expect(field2AfterRename).toBeVisible();
      await expect(field2AfterRename).toHaveValue(field2Value);
    }
  });

  test('フィールドの順序を変更しても値が維持される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);

    if (loaded) {
      const timestamp = Date.now();
      const field1 = `FieldA_${timestamp}`;
      const field2 = `FieldB_${timestamp}`;
      const field1Value = `値A_${timestamp}`;
      const field2Value = `値B_${timestamp}`;

      // フィールド編集モードに入る
      const editButton = page.getByTitle('フィールドを編集');
      await editButton.click();
      await page.waitForTimeout(300);

      // 2つの新規フィールドを追加
      const input = page.getByPlaceholder('新しいフィールド名を入力');
      const addButton = page.getByTitle('フィールドを追加');

      await input.fill(field1);
      await addButton.click();
      await page.waitForTimeout(200);

      await input.fill(field2);
      await addButton.click();
      await page.waitForTimeout(200);

      // 編集モードの保存をクリック
      const saveButtonInEditMode = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
      await saveButtonInEditMode.click();
      await page.waitForTimeout(300);

      // 両方のフィールドに値を入力
      const field1Input = page.getByPlaceholder(`${field1}を入力`);
      await field1Input.fill(field1Value);
      await page.waitForTimeout(100);

      const field2Input = page.getByPlaceholder(`${field2}を入力`);
      await field2Input.fill(field2Value);
      await page.waitForTimeout(100);

      // プロパティを保存
      const mainSaveButton = page.getByRole('button', { name: /保存/ });
      await mainSaveButton.click();
      await page.waitForTimeout(500);

      // 値が保存されていることを確認
      await expect(page.getByPlaceholder(`${field1}を入力`)).toHaveValue(field1Value);
      await expect(page.getByPlaceholder(`${field2}を入力`)).toHaveValue(field2Value);
    }
  });
});
