import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownTableGenerator } from '../../lib/markdownTableGenerator';
import { GeneratorTestFixtures } from './helpers/generatorTestFixtures';

describe('MarkdownTableGenerator', () => {
  let fixtures: GeneratorTestFixtures;

  beforeEach(() => {
    fixtures = new GeneratorTestFixtures('markdown-table-generator-test');
    fixtures.setup();
  });

  afterEach(() => {
    fixtures.cleanup();
  });

  test('generates markdown table with correct format', async () => {
    const generator = new MarkdownTableGenerator(fixtures.testRootPath);
    const output = await generator.generateMarkdownTable();

    // タイムスタンプ部分を固定値に置換
    const normalized = output.replace(/最終更新: .+\n/g, '最終更新: 2026/1/22 0:00:00\n');

    expect(normalized).toMatchSnapshot();
  });
});
