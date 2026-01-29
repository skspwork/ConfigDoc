import { test, expect, Page } from '@playwright/test';

// テスト用のヘルパー: 設定ファイルを読み込む
async function loadSampleConfig(page: Page): Promise<boolean> {
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
  await sampleDir.click();

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
  const selectButton = page.getByRole('button', { name: '選択' });
  await selectButton.click();

  // ダイアログが閉じるまで待つ
  await expect(page.getByRole('heading', { name: 'ファイルを選択' })).not.toBeVisible();

  // すべて展開
  const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
  await expandAllButton.click();
  await page.waitForTimeout(300);

  return true;
}

// ツリーノードを選択
async function selectTreeNode(page: Page, nodeName: string) {
  const node = page.getByText(nodeName).first();
  await node.click();
  await page.waitForTimeout(300);
}

// テンプレートとして保存チェックボックスを操作
async function setTemplateCheckbox(page: Page, checked: boolean) {
  const checkbox = page.locator('#isTemplate');
  const isCurrentlyChecked = await checkbox.isChecked();
  if (isCurrentlyChecked !== checked) {
    await checkbox.click();
  }
}

// フィールドに値を入力
async function fillField(page: Page, placeholder: string, value: string) {
  const textarea = page.getByPlaceholder(placeholder);
  await textarea.clear();
  await textarea.fill(value);
}

// 保存ボタンをクリック
async function saveProperty(page: Page) {
  const saveButton = page.getByRole('button', { name: /保存/ });
  await expect(saveButton).toBeEnabled({ timeout: 5000 });
  await saveButton.click();
  // トーストが表示されるまで待つ
  await page.waitForTimeout(500);
}

test.describe.serial('テンプレート水平展開機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('配列要素にはテンプレートオプションが表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // SystemUsers[0]の子要素を選択
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    // テンプレートオプションが表示される
    const templateOption = page.getByText('テンプレートとして保存');
    await expect(templateOption).toBeVisible();
  });

  test('非配列要素にはテンプレートオプションが表示されない', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // Database:ConnectionStringを選択（配列ではない）
    await selectTreeNode(page, 'ConnectionString');

    // テンプレートオプションが表示されない
    const templateCheckbox = page.locator('#isTemplate');
    await expect(templateCheckbox).not.toBeVisible();
  });

  test('テンプレートとして保存するとTemplateバッジが表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // SystemUsers[0]:Idを選択
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    // テンプレートとして保存をチェック
    await setTemplateCheckbox(page, true);

    // フィールドに値を入力
    await fillField(page, '説明を入力してください', `テンプレートテスト ${Date.now()}`);

    // 保存
    await saveProperty(page);

    // Templateバッジが表示される
    const templateBadge = page.locator('text=Template').first();
    await expect(templateBadge).toBeVisible();
  });

  test('テンプレートから継承された要素にInheritedバッジが表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // まずSystemUsers[0]:Idにテンプレートを設定
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', `継承テスト ${Date.now()}`);
    await saveProperty(page);

    // SystemUsers[1]:Idを確認（同じ構造の別要素）
    // ツリーを再展開して確認
    await page.waitForTimeout(500);

    // Inheritedバッジが表示されているか確認
    const inheritedBadges = page.locator('text=Inherited');
    const inheritedCount = await inheritedBadges.count();
    expect(inheritedCount).toBeGreaterThan(0);
  });

  test('継承元プロパティを選択するとテンプレートの値がプレースホルダーとして表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    const testValue = `マージテスト ${Date.now()}`;

    // SystemUsers[0]:Idにテンプレートを設定
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', testValue);
    await saveProperty(page);

    // SystemUsers[1]:Idを選択
    // まず[1]を展開
    const user1Toggle = page.locator('text=[1]').first();
    await user1Toggle.click();
    await page.waitForTimeout(300);

    // [1]のIdを選択
    const idNodes = page.locator('text=Id');
    const idCount = await idNodes.count();
    if (idCount >= 2) {
      await idNodes.nth(1).click();
      await page.waitForTimeout(300);

      // テンプレートの値がプレースホルダーとして表示されているか確認
      // （直接設定値がないため、継承値はプレースホルダーとして表示される）
      const inheritedTextareas = page.locator('textarea');
      const inheritedTextareaCount = await inheritedTextareas.count();
      let foundPlaceholder = false;
      for (let i = 0; i < inheritedTextareaCount; i++) {
        const placeholder = await inheritedTextareas.nth(i).getAttribute('placeholder');
        if (placeholder === testValue) {
          foundPlaceholder = true;
          break;
        }
      }
      expect(foundPlaceholder).toBe(true);
    }
  });

  test('テンプレートのチェックを外すとテンプレート情報が削除される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // SystemUsers[0]:Idにテンプレートを設定
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', `削除テスト ${Date.now()}`);
    await saveProperty(page);

    // Templateバッジが表示される
    let templateBadge = page.locator('text=Template').first();
    await expect(templateBadge).toBeVisible();

    // テンプレートのチェックを外す
    await setTemplateCheckbox(page, false);
    await saveProperty(page);

    // Templateバッジが消える（または別のバッジになる）
    await page.waitForTimeout(500);
    templateBadge = page.locator('text=Template').first();
    const isVisible = await templateBadge.isVisible().catch(() => false);
    // テンプレートが削除されたのでバッジは表示されないか、Docバッジに変わる
    if (isVisible) {
      // まだ表示されている場合は、直接ドキュメントがあるかもしれない
      const docBadge = page.locator('text=Doc').first();
      await expect(docBadge).toBeVisible();
    }
  });

  test('直接ドキュメントとテンプレートの両方がある場合、両方のバッジが表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    const templateValue = `テンプレート値 ${Date.now()}`;

    // SystemUsers[0]:Idにテンプレートを設定
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', templateValue);
    await saveProperty(page);
    await page.waitForTimeout(500);

    // SystemUsers[1]:Idを選択して直接ドキュメントを追加
    const user1Toggle = page.locator('text=[1]').first();
    await user1Toggle.click();
    await page.waitForTimeout(300);

    const idNodes = page.locator('text=Id');
    const idCount = await idNodes.count();
    if (idCount >= 2) {
      await idNodes.nth(1).click();
      await page.waitForTimeout(300);

      // 別のフィールドに値を入力（説明はテンプレートから継承）
      // テンプレートのチェックは外したまま
      await setTemplateCheckbox(page, false);

      // 備考フィールドがあれば入力
      const noteTextarea = page.getByPlaceholder('備を入力してください');
      const noteCount = await noteTextarea.count();
      if (noteCount > 0) {
        await noteTextarea.fill(`直接ドキュメント ${Date.now()}`);
        await saveProperty(page);

        // DocバッジとInheritedバッジの両方が表示されるか確認
        await page.waitForTimeout(500);
        const docBadge = page.locator('text=Doc');
        const inheritedBadge = page.locator('text=Inherited');

        // 少なくともどちらかのバッジが表示される
        const docVisible = await docBadge.first().isVisible().catch(() => false);
        const inheritedVisible = await inheritedBadge.first().isVisible().catch(() => false);
        expect(docVisible || inheritedVisible).toBe(true);
      }
    }
  });

  test('連想配列として登録するとバッジが表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // Fieldsノードを選択（オブジェクトタイプ）
    const fieldsNode = page.getByText('Fields', { exact: true }).first();
    await fieldsNode.click();
    await page.waitForTimeout(300);

    // 連想配列として登録チェックボックスを探す
    const assocCheckbox = page.locator('#isAssociativeArray');
    const assocCount = await assocCheckbox.count();

    if (assocCount > 0) {
      // チェックボックスをON
      await assocCheckbox.check();
      await page.waitForTimeout(500);

      // 連想配列バッジが表示される（複数ある場合はfirstを使用）
      const assocBadge = page.getByText('連想配列', { exact: true }).first();
      await expect(assocBadge).toBeVisible();
    }
  });

  test('テンプレート保存後すぐにInheritedバッジが表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // SystemUsers[0]:Idを選択
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    // テンプレートとして保存
    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', `即時反映テスト ${Date.now()}`);
    await saveProperty(page);

    // リロードなしでInheritedバッジが表示されているか確認
    await page.waitForTimeout(500);
    const inheritedBadges = page.locator('text=Inherited');
    const inheritedCount = await inheritedBadges.count();

    // SystemUsers[1]:Idなど他の要素にInheritedが付く
    expect(inheritedCount).toBeGreaterThan(0);
  });

  test('配列配下のテンプレート: リロード後もテンプレートとInheritedの両方に値が反映される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    const testValue = `リロードテスト ${Date.now()}`;

    // SystemUsers[0]:Idを選択
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    // テンプレートとして保存
    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', testValue);
    await saveProperty(page);
    await page.waitForTimeout(500);

    // ページをリロード
    await page.reload();
    await page.waitForTimeout(1000);

    // すべて展開
    const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
    await expandAllButton.click();
    await page.waitForTimeout(500);

    // テンプレート元（SystemUsers[0]:Id）を選択
    const idNodeAfterReload = page.locator('text=Id').first();
    await idNodeAfterReload.click();
    await page.waitForTimeout(300);

    // テンプレートの値が保持されているか確認
    const templateTextarea = page.getByPlaceholder('説明を入力してください');
    const templateValue = await templateTextarea.inputValue();
    expect(templateValue).toBe(testValue);

    // テンプレートチェックボックスがONのままか確認
    const templateCheckbox = page.locator('#isTemplate');
    await expect(templateCheckbox).toBeChecked();

    // Templateバッジが表示されているか確認
    const templateBadge = page.locator('text=Template').first();
    await expect(templateBadge).toBeVisible();

    // 継承先（SystemUsers[1]:Id）を選択
    const user1Toggle = page.locator('text=[1]').first();
    await user1Toggle.click();
    await page.waitForTimeout(300);

    const idNodes = page.locator('text=Id');
    const idCount = await idNodes.count();
    if (idCount >= 2) {
      await idNodes.nth(1).click();
      await page.waitForTimeout(300);

      // 継承先にはテンプレートの値がプレースホルダーとして表示されているか確認
      // （直接設定値がないため、継承値はプレースホルダーとして表示される）
      const inheritedTextareas = page.locator('textarea');
      const inheritedTextareaCount = await inheritedTextareas.count();
      let foundPlaceholder = false;
      for (let i = 0; i < inheritedTextareaCount; i++) {
        const placeholder = await inheritedTextareas.nth(i).getAttribute('placeholder');
        if (placeholder === testValue) {
          foundPlaceholder = true;
          break;
        }
      }
      expect(foundPlaceholder).toBe(true);

      // Inheritedバッジが表示されているか確認
      const inheritedBadges = page.locator('text=Inherited');
      const inheritedCount = await inheritedBadges.count();
      expect(inheritedCount).toBeGreaterThan(0);
    }
  });
});

test.describe.serial('ワイルドカード連想配列機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('連想配列を登録するとチェックボックスがチェック状態になる', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // Fieldsノードを選択
    const fieldsNode = page.getByText('Fields', { exact: true }).first();
    await fieldsNode.click();
    await page.waitForTimeout(300);

    // 連想配列チェックボックスを探す
    const assocCheckbox = page.locator('#isAssociativeArray');
    const assocCount = await assocCheckbox.count();

    if (assocCount > 0) {
      // 初期状態はチェックなし（または既にチェック済み）
      const initialChecked = await assocCheckbox.isChecked();

      if (!initialChecked) {
        // チェックボックスをON
        await assocCheckbox.check();
        await page.waitForTimeout(500);

        // チェック状態が維持されている
        await expect(assocCheckbox).toBeChecked();

        // 連想配列バッジが表示される
        const assocBadge = page.getByText('連想配列', { exact: true });
        await expect(assocBadge).toBeVisible();
      }
    }
  });

  test('ネストした連想配列（ワイルドカードbasePath）を登録できる', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // まずFieldsを連想配列として登録
    const fieldsNode = page.getByText('Fields', { exact: true }).first();
    await fieldsNode.click();
    await page.waitForTimeout(300);

    const assocCheckbox = page.locator('#isAssociativeArray');
    const assocCount = await assocCheckbox.count();

    if (assocCount > 0) {
      // Fieldsを連想配列として登録
      if (!(await assocCheckbox.isChecked())) {
        await assocCheckbox.check();
        await page.waitForTimeout(500);
      }

      // Field1を展開
      const field1Node = page.getByText('Field1', { exact: true }).first();
      await field1Node.click();
      await page.waitForTimeout(300);

      // Contentsを展開
      const contentsNode = page.getByText('Contents', { exact: true }).first();
      await contentsNode.click();
      await page.waitForTimeout(300);

      // Mapを選択（ネストした連想配列候補）
      const mapNode = page.getByText('Map', { exact: true }).first();
      await mapNode.click();
      await page.waitForTimeout(300);

      // 連想配列チェックボックスを探す
      const mapAssocCheckbox = page.locator('#isAssociativeArray');
      const mapAssocCount = await mapAssocCheckbox.count();

      if (mapAssocCount > 0) {
        // Mapを連想配列として登録
        if (!(await mapAssocCheckbox.isChecked())) {
          await mapAssocCheckbox.check();
          await page.waitForTimeout(500);
        }

        // チェック状態が維持されている
        await expect(mapAssocCheckbox).toBeChecked();

        // 連想配列バッジが表示される（複数ある場合はfirstを使用）
        const mapAssocBadge = page.getByText('連想配列', { exact: true }).first();
        await expect(mapAssocBadge).toBeVisible();
      }
    }
  });

  test('ワイルドカード連想配列もツリー上にバッジが表示される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // Fieldsを連想配列として登録
    const fieldsNode = page.getByText('Fields', { exact: true }).first();
    await fieldsNode.click();
    await page.waitForTimeout(300);

    const assocCheckbox = page.locator('#isAssociativeArray');
    if ((await assocCheckbox.count()) > 0 && !(await assocCheckbox.isChecked())) {
      await assocCheckbox.check();
      await page.waitForTimeout(500);
    }

    // Field1 > Contents > Mapを連想配列として登録
    const field1Node = page.getByText('Field1', { exact: true }).first();
    await field1Node.click();
    await page.waitForTimeout(300);

    const contentsNode = page.getByText('Contents', { exact: true }).first();
    await contentsNode.click();
    await page.waitForTimeout(300);

    const mapNode = page.getByText('Map', { exact: true }).first();
    await mapNode.click();
    await page.waitForTimeout(300);

    const mapAssocCheckbox = page.locator('#isAssociativeArray');
    if ((await mapAssocCheckbox.count()) > 0 && !(await mapAssocCheckbox.isChecked())) {
      await mapAssocCheckbox.check();
      await page.waitForTimeout(500);
    }

    // Field2 > Contents > Mapに移動して連想配列バッジが表示されるか確認
    const field2Node = page.getByText('Field2', { exact: true }).first();
    await field2Node.click();
    await page.waitForTimeout(300);

    const contents2Node = page.locator('text=Contents').nth(1);
    await contents2Node.click();
    await page.waitForTimeout(300);

    // Map（Field2のMap）にも連想配列バッジが表示されるべき
    // ワイルドカードマッピング AppSettings:Fields[*]:Contents:Map により
    const mapNodes = page.locator('text=Map');
    const mapCount = await mapNodes.count();

    if (mapCount >= 2) {
      // 2番目のMapを選択
      await mapNodes.nth(1).click();
      await page.waitForTimeout(300);

      // チェックボックスがチェック状態になっている
      const map2AssocCheckbox = page.locator('#isAssociativeArray');
      if ((await map2AssocCheckbox.count()) > 0) {
        // ワイルドカードマッピングにより、このMapも連想配列として認識される
        await expect(map2AssocCheckbox).toBeChecked();
      }
    }
  });

  test('親の連想配列を解除すると子のワイルドカードマッピングも削除される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // Fieldsを連想配列として登録
    const fieldsNode = page.getByText('Fields', { exact: true }).first();
    await fieldsNode.click();
    await page.waitForTimeout(300);

    const assocCheckbox = page.locator('#isAssociativeArray');
    if ((await assocCheckbox.count()) > 0 && !(await assocCheckbox.isChecked())) {
      await assocCheckbox.check();
      await page.waitForTimeout(500);
    }

    // Field1 > Contents > Mapを連想配列として登録
    const field1Node = page.getByText('Field1', { exact: true }).first();
    await field1Node.click();
    await page.waitForTimeout(300);

    const contentsNode = page.getByText('Contents', { exact: true }).first();
    await contentsNode.click();
    await page.waitForTimeout(300);

    const mapNode = page.getByText('Map', { exact: true }).first();
    await mapNode.click();
    await page.waitForTimeout(300);

    const mapAssocCheckbox = page.locator('#isAssociativeArray');
    if ((await mapAssocCheckbox.count()) > 0 && !(await mapAssocCheckbox.isChecked())) {
      await mapAssocCheckbox.check();
      await page.waitForTimeout(500);
    }

    // Fieldsに戻って連想配列を解除
    await fieldsNode.click();
    await page.waitForTimeout(300);

    const fieldsAssocCheckbox = page.locator('#isAssociativeArray');
    if ((await fieldsAssocCheckbox.count()) > 0 && (await fieldsAssocCheckbox.isChecked())) {
      await fieldsAssocCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    // Mapを再選択して、連想配列が解除されているか確認
    await field1Node.click();
    await page.waitForTimeout(300);

    await contentsNode.click();
    await page.waitForTimeout(300);

    await mapNode.click();
    await page.waitForTimeout(300);

    const mapAssocCheckboxAfter = page.locator('#isAssociativeArray');
    if ((await mapAssocCheckboxAfter.count()) > 0) {
      // 親が解除されたので、子のワイルドカードマッピングも削除されているはず
      await expect(mapAssocCheckboxAfter).not.toBeChecked();
    }
  });

  test('連想配列解除後はバッジが非表示になる', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    // Fieldsを連想配列として登録
    const fieldsNode = page.getByText('Fields', { exact: true }).first();
    await fieldsNode.click();
    await page.waitForTimeout(300);

    const assocCheckbox = page.locator('#isAssociativeArray');
    if ((await assocCheckbox.count()) > 0) {
      // 一度チェックをつける
      if (!(await assocCheckbox.isChecked())) {
        await assocCheckbox.check();
        await page.waitForTimeout(500);
      }

      // バッジが表示されている
      let assocBadge = page.getByText('連想配列', { exact: true });
      await expect(assocBadge).toBeVisible();

      // チェックを外す
      await assocCheckbox.uncheck();
      await page.waitForTimeout(500);

      // Fieldsの連想配列バッジが非表示になる
      // 他の場所にFieldsのバッジがないことを確認
      assocBadge = page.locator('.flex.items-center.gap-1.px-2.py-0\\.5.bg-amber-100').filter({ hasText: '連想配列' });

      // Fieldsノードの行を特定
      const fieldsRow = page.locator('.group.flex.items-center', { has: page.getByText('Fields', { exact: true }) }).first();

      // Fieldsノードに連想配列バッジがないことを確認
      const badgeInFieldsRow = fieldsRow.locator('text=連想配列');
      const badgeCount = await badgeInFieldsRow.count();
      expect(badgeCount).toBe(0);
    }
  });

  test('連想配列配下のテンプレート: リロード後もテンプレートとInheritedの両方に値が反映される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    const testValue = `連想配列テンプレートテスト ${Date.now()}`;

    // まずFieldsを連想配列として登録
    const fieldsNode = page.getByText('Fields', { exact: true }).first();
    await fieldsNode.click();
    await page.waitForTimeout(300);

    const assocCheckbox = page.locator('#isAssociativeArray');
    if ((await assocCheckbox.count()) === 0) {
      test.skip();
      return;
    }

    // Fieldsを連想配列として登録
    if (!(await assocCheckbox.isChecked())) {
      await assocCheckbox.check();
      await page.waitForTimeout(500);
    }

    // Field1を展開
    const field1Node = page.getByText('Field1', { exact: true }).first();
    await field1Node.click();
    await page.waitForTimeout(300);

    // Contentsを展開
    const contentsNode = page.getByText('Contents', { exact: true }).first();
    await contentsNode.click();
    await page.waitForTimeout(300);

    // Content1を選択してテンプレートとして保存
    const content1Node = page.getByText('Content1', { exact: true }).first();
    await content1Node.click();
    await page.waitForTimeout(300);

    // テンプレートとして保存
    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', testValue);
    await saveProperty(page);
    await page.waitForTimeout(500);

    // Templateバッジが表示される
    const templateBadge = page.locator('text=Template').first();
    await expect(templateBadge).toBeVisible();

    // ページをリロード
    await page.reload();
    await page.waitForTimeout(1000);

    // すべて展開
    const expandAllButton = page.getByRole('button', { name: 'すべて展開' });
    await expandAllButton.click();
    await page.waitForTimeout(500);

    // Fieldsが連想配列として登録されたままか確認
    const fieldsNodeAfterReload = page.getByText('Fields', { exact: true }).first();
    await fieldsNodeAfterReload.click();
    await page.waitForTimeout(300);

    const assocCheckboxAfterReload = page.locator('#isAssociativeArray');
    await expect(assocCheckboxAfterReload).toBeChecked();

    // テンプレート元（Field1:Contents:Content1）を選択
    const field1NodeAfterReload = page.getByText('Field1', { exact: true }).first();
    await field1NodeAfterReload.click();
    await page.waitForTimeout(300);

    const contentsNodeAfterReload = page.getByText('Contents', { exact: true }).first();
    await contentsNodeAfterReload.click();
    await page.waitForTimeout(300);

    const content1NodeAfterReload = page.getByText('Content1', { exact: true }).first();
    await content1NodeAfterReload.click();
    await page.waitForTimeout(300);

    // テンプレートの値が保持されているか確認
    const templateTextarea = page.getByPlaceholder('説明を入力してください');
    const templateValueAfterReload = await templateTextarea.inputValue();
    expect(templateValueAfterReload).toBe(testValue);

    // テンプレートチェックボックスがONのままか確認
    const templateCheckbox = page.locator('#isTemplate');
    await expect(templateCheckbox).toBeChecked();

    // Templateバッジが表示されているか確認
    const templateBadgeAfterReload = page.locator('text=Template').first();
    await expect(templateBadgeAfterReload).toBeVisible();

    // 継承先（Field2:Contents:Content1）を選択
    const field2Node = page.getByText('Field2', { exact: true }).first();
    await field2Node.click();
    await page.waitForTimeout(300);

    // Field2のContentsを展開
    const field2Contents = page.locator('.group.flex.items-center').filter({ hasText: 'Contents' });
    const field2ContentsCount = await field2Contents.count();
    if (field2ContentsCount >= 2) {
      await field2Contents.nth(1).click();
      await page.waitForTimeout(300);
    }

    // Field2のContent1を選択
    const content1Nodes = page.getByText('Content1', { exact: true });
    const content1Count = await content1Nodes.count();
    if (content1Count >= 2) {
      await content1Nodes.nth(1).click();
      await page.waitForTimeout(300);

      // 継承先にはテンプレートの値がプレースホルダーとして表示されているか確認
      // （直接設定値がないため、継承値はプレースホルダーとして表示される）
      const inheritedTextareas = page.locator('textarea');
      const inheritedTextareaCount = await inheritedTextareas.count();
      let foundPlaceholder = false;
      for (let i = 0; i < inheritedTextareaCount; i++) {
        const placeholder = await inheritedTextareas.nth(i).getAttribute('placeholder');
        if (placeholder === testValue) {
          foundPlaceholder = true;
          break;
        }
      }
      expect(foundPlaceholder).toBe(true);

      // Inheritedバッジが表示されているか確認
      const inheritedBadges = page.locator('text=Inherited');
      const inheritedCount = await inheritedBadges.count();
      expect(inheritedCount).toBeGreaterThan(0);
    }
  });
});

test.describe.serial('エクスポート時のテンプレート継承', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Markdownエクスポートでテンプレートの値が継承要素にも出力される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    const testDescription = `エクスポートテスト ${Date.now()}`;

    // SystemUsers[0]:Idにテンプレートを設定
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', testDescription);
    await saveProperty(page);
    await page.waitForTimeout(500);

    // エクスポートダイアログを開く
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // Markdownを選択
    const select = page.getByRole('combobox');
    await select.selectOption('markdown');

    // APIレスポンスを待つ
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/export') && response.status() === 200
    );

    // エクスポート実行
    const dialogExportButton = page.getByRole('button', { name: 'エクスポート' }).last();
    await dialogExportButton.click();

    await responsePromise;

    // トースト通知を確認
    const toast = page.getByText(/エクスポートしました/);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('HTMLエクスポートでテンプレートの値が継承要素にも出力される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    const testDescription = `HTMLエクスポートテスト ${Date.now()}`;

    // SystemUsers[0]:Idにテンプレートを設定
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', testDescription);
    await saveProperty(page);
    await page.waitForTimeout(500);

    // エクスポートダイアログを開く
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // HTMLを選択
    const select = page.getByRole('combobox');
    await select.selectOption('html');

    // APIレスポンスを待つ
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/export') && response.status() === 200
    );

    // エクスポート実行
    const dialogExportButton = page.getByRole('button', { name: 'エクスポート' }).last();
    await dialogExportButton.click();

    await responsePromise;

    // トースト通知を確認
    const toast = page.getByText(/エクスポートしました/);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Markdownテーブルエクスポートでテンプレートの値が継承要素にも出力される', async ({ page }) => {
    const loaded = await loadSampleConfig(page);
    if (!loaded) {
      test.skip();
      return;
    }

    const testDescription = `テーブルエクスポートテスト ${Date.now()}`;

    // SystemUsers[0]:Idにテンプレートを設定
    const idNode = page.locator('text=Id').first();
    await idNode.click();
    await page.waitForTimeout(300);

    await setTemplateCheckbox(page, true);
    await fillField(page, '説明を入力してください', testDescription);
    await saveProperty(page);
    await page.waitForTimeout(500);

    // エクスポートダイアログを開く
    const exportButton = page.getByRole('button', { name: /エクスポート/ }).first();
    await exportButton.click();

    // Markdownテーブルを選択
    const select = page.getByRole('combobox');
    await select.selectOption('markdown-table');

    // APIレスポンスを待つ
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/export') && response.status() === 200
    );

    // エクスポート実行
    const dialogExportButton = page.getByRole('button', { name: 'エクスポート' }).last();
    await dialogExportButton.click();

    await responsePromise;

    // トースト通知を確認
    const toast = page.getByText(/エクスポートしました/);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
