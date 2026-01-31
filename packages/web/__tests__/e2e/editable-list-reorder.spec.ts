import { test, expect } from './fixtures';

// テスト用のヘルパー: 設定ファイルを読み込んでプロパティを選択
async function loadConfigAndSelectProperty(page: any) {
  // E2Eセットアップで既にタブが存在するか確認
  const existingTab = page.locator('[draggable="true"]').first();
  const existingTabCount = await existingTab.count();

  // タブが存在しない場合はファイルを追加
  if (existingTabCount === 0) {
    const addButton = page.getByRole('button', { name: /ファイルを追加/ });
    await addButton.click();

    await expect(page.getByRole('heading', { name: 'ファイルを選択' })).toBeVisible();

    const dialogContainer = page.locator('.bg-white.rounded-lg.shadow-xl');

    await page.waitForSelector('text=sample', { timeout: 5000 }).catch(() => null);

    const sampleDir = dialogContainer.locator('text=sample').first();
    const sampleCount = await sampleDir.count();
    if (sampleCount === 0) {
      await page.getByRole('button', { name: 'キャンセル' }).click();
      return false;
    }
    await sampleDir.dblclick();
    await page.waitForTimeout(500);

    await page.waitForSelector('text=appsettings.json', { timeout: 5000 }).catch(() => null);

    const jsonFile = dialogContainer.locator('text=appsettings.json').first();
    const jsonCount = await jsonFile.count();
    if (jsonCount === 0) {
      await page.getByRole('button', { name: 'キャンセル' }).click();
      return false;
    }
    await jsonFile.click();

    const selectButton = dialogContainer.getByRole('button', { name: '選択' });
    await selectButton.click();

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

test.describe('タグの並び替え', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('タグ編集モードでドラッグハンドルが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // 編集モードに入る
    const editButton = page.getByTitle('タグを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    // ドラッグハンドル（GripVerticalIcon）が表示される
    const dragHandles = page.locator('[title="ドラッグして並び替え"]');
    const handleCount = await dragHandles.count();
    expect(handleCount).toBeGreaterThan(0);
  });

  test('タグ編集モードで「ドラッグで並び替え可能」のテキストが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // 編集モードに入る
    const editButton = page.getByTitle('タグを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    // 説明テキストが表示される
    const description = page.getByText('ドラッグで並び替え可能');
    await expect(description).toBeVisible();
  });

  test('タグをドラッグ&ドロップで並び替えできる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // 編集モードに入る
    const editButton = page.getByTitle('タグを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    // タグの入力フィールドを取得
    const tagInputs = page.locator('input[placeholder="タグ名"]');
    const inputCount = await tagInputs.count();

    if (inputCount < 2) {
      // タグが2つ未満の場合はスキップ
      return;
    }

    // 最初のタグの値を取得
    const firstTagValue = await tagInputs.first().inputValue();
    const secondTagValue = await tagInputs.nth(1).inputValue();

    // ドラッグハンドルを取得
    const dragHandles = page.locator('[title="ドラッグして並び替え"]');

    // 最初のタグを2番目にドラッグ
    await dragHandles.first().dragTo(dragHandles.nth(1));
    await page.waitForTimeout(300);

    // 順序が変わったことを確認
    const newFirstTagValue = await tagInputs.first().inputValue();
    const newSecondTagValue = await tagInputs.nth(1).inputValue();

    // ドラッグ後は順序が入れ替わっている
    expect(newFirstTagValue).toBe(secondTagValue);
    expect(newSecondTagValue).toBe(firstTagValue);
  });

  test('タグの並び替え後に保存すると順序が保持される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // 編集モードに入る
    const editButton = page.getByTitle('タグを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    const tagInputs = page.locator('input[placeholder="タグ名"]');
    const inputCount = await tagInputs.count();

    if (inputCount < 2) {
      return;
    }

    // 最初の2つのタグの値を取得
    const firstTagValue = await tagInputs.first().inputValue();
    const secondTagValue = await tagInputs.nth(1).inputValue();

    // ドラッグして並び替え
    const dragHandles = page.locator('[title="ドラッグして並び替え"]');
    await dragHandles.first().dragTo(dragHandles.nth(1));
    await page.waitForTimeout(300);

    // 保存
    const saveButton = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
    await saveButton.click();
    await page.waitForTimeout(300);

    // 編集モードを再度開く
    await editButton.click();
    await page.waitForTimeout(300);

    // 並び替えが保持されていることを確認
    const newFirstTagValue = await tagInputs.first().inputValue();
    const newSecondTagValue = await tagInputs.nth(1).inputValue();

    expect(newFirstTagValue).toBe(secondTagValue);
    expect(newSecondTagValue).toBe(firstTagValue);
  });
});

test.describe('フィールドの並び替え', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('フィールド編集モードでドラッグハンドルが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // フィールド編集モードに入る
    const editButton = page.getByTitle('フィールドを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    // ドラッグハンドルが表示される
    const dragHandles = page.locator('[title="ドラッグして並び替え"]');
    const handleCount = await dragHandles.count();
    expect(handleCount).toBeGreaterThan(0);
  });

  test('フィールド編集モードで「ドラッグで並び替え可能」のテキストが表示される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // フィールド編集モードに入る
    const editButton = page.getByTitle('フィールドを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    // 説明テキストが表示される
    const description = page.getByText('ドラッグで並び替え可能');
    await expect(description).toBeVisible();
  });

  test('フィールドを追加して並び替えできる', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // フィールド編集モードに入る
    const editButton = page.getByTitle('フィールドを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    // 新しいフィールドを追加（ユニークな名前）
    const timestamp = Date.now();
    const newFieldName = `テストフィールド${timestamp}`;
    const input = page.getByPlaceholder('新しいフィールド名を入力');
    await input.fill(newFieldName);

    const addButton = page.getByTitle('フィールドを追加');
    await addButton.click();
    await page.waitForTimeout(300);

    // ドラッグハンドルの数が増えたことを確認
    const dragHandles = page.locator('[title="ドラッグして並び替え"]');
    const handleCount = await dragHandles.count();
    expect(handleCount).toBeGreaterThanOrEqual(2);

    // 最後のフィールドを最初にドラッグ
    if (handleCount >= 2) {
      await dragHandles.last().dragTo(dragHandles.first());
      await page.waitForTimeout(300);

      // フィールド入力の最初が新しく追加したフィールドになっていることを確認
      const fieldInputs = page.locator('input[placeholder="フィールド名"]');
      const firstFieldValue = await fieldInputs.first().inputValue();
      expect(firstFieldValue).toBe(newFieldName);
    }

    // キャンセルして変更を破棄
    const cancelButton = page.getByRole('button', { name: 'キャンセル' });
    await cancelButton.click();
  });

  test('フィールドの並び替え後に保存すると順序が保持される', async ({ page }) => {
    const loaded = await loadConfigAndSelectProperty(page);
    if (!loaded) return;

    // フィールド編集モードに入る
    const editButton = page.getByTitle('フィールドを編集');
    await editButton.click();
    await page.waitForTimeout(300);

    // 新しいフィールドを2つ追加
    const timestamp = Date.now();
    const field1 = `フィールドA${timestamp}`;
    const field2 = `フィールドB${timestamp}`;

    const input = page.getByPlaceholder('新しいフィールド名を入力');
    const addButton = page.getByTitle('フィールドを追加');

    await input.fill(field1);
    await addButton.click();
    await page.waitForTimeout(200);

    await input.fill(field2);
    await addButton.click();
    await page.waitForTimeout(200);

    // フィールド入力を取得
    const fieldInputs = page.locator('input[placeholder="フィールド名"]');
    const inputCount = await fieldInputs.count();

    // 最後の2つのフィールドを入れ替え
    if (inputCount >= 2) {
      const dragHandles = page.locator('[title="ドラッグして並び替え"]');

      // 最後から2番目を最後にドラッグ
      await dragHandles.nth(inputCount - 2).dragTo(dragHandles.nth(inputCount - 1));
      await page.waitForTimeout(300);
    }

    // 保存
    const saveButton = page.locator('button.bg-green-500, button.bg-green-600').filter({ hasText: '保存' });
    await saveButton.click();
    await page.waitForTimeout(300);

    // 再度編集モードを開いて順序を確認
    await editButton.click();
    await page.waitForTimeout(300);

    // 最後の2つのフィールドの順序が入れ替わっていることを確認
    const newFieldInputs = page.locator('input[placeholder="フィールド名"]');
    const newInputCount = await newFieldInputs.count();

    if (newInputCount >= 2) {
      const lastValue = await newFieldInputs.nth(newInputCount - 1).inputValue();
      const secondLastValue = await newFieldInputs.nth(newInputCount - 2).inputValue();

      // field1とfield2の順序が入れ替わっている
      expect(secondLastValue).toBe(field2);
      expect(lastValue).toBe(field1);
    }

    // クリーンアップ: 追加したフィールドを削除
    const deleteButtons = page.getByTitle('フィールドを削除');
    const deleteCount = await deleteButtons.count();

    // 最後の2つを削除
    if (deleteCount >= 2) {
      await deleteButtons.last().click();
      await page.waitForTimeout(100);
      await deleteButtons.nth(deleteCount - 2).click();
      await page.waitForTimeout(100);
    }

    // 保存してクリーンアップを確定
    await saveButton.click();
  });
});
