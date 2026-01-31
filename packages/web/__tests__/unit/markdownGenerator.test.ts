import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownGenerator } from '../../lib/markdownGenerator';
import { GeneratorTestFixtures } from './helpers/generatorTestFixtures';

describe('MarkdownGenerator', () => {
  let fixtures: GeneratorTestFixtures;

  beforeEach(() => {
    fixtures = new GeneratorTestFixtures('markdown-generator-test');
    fixtures.setup();
  });

  afterEach(() => {
    // 確実にクリーンアップ（エラーが発生しても継続）
    fixtures?.cleanup();
  });

  test('generates markdown with correct format', async () => {
    const generator = new MarkdownGenerator(fixtures.testRootPath);
    const output = await generator.generateMarkdown();

    // タイムスタンプ部分を固定値に置換
    const normalized = output.replace(/最終更新: .+\n/g, '最終更新: 2026/1/22 0:00:00\n');

    expect(normalized).toMatchSnapshot();
  });
});
