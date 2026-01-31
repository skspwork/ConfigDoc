import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { HtmlGenerator } from '../../lib/htmlGenerator';
import { GeneratorTestFixtures } from './helpers/generatorTestFixtures';

describe('HtmlGenerator', () => {
  let fixtures: GeneratorTestFixtures;

  beforeEach(() => {
    fixtures = new GeneratorTestFixtures('html-generator-test');
    fixtures.setup();
  });

  afterEach(() => {
    // 確実にクリーンアップ（エラーが発生しても継続）
    fixtures?.cleanup();
  });

  test('generates HTML with correct format', async () => {
    const generator = new HtmlGenerator(fixtures.testRootPath);
    const output = await generator.generateHtml();

    // タイムスタンプ部分を固定値に置換
    const normalized = output.replace(/最終更新: .+<\/p>/g, '最終更新: 2026/1/22 0:00:00</p>');

    expect(normalized).toMatchSnapshot();
  });
});
