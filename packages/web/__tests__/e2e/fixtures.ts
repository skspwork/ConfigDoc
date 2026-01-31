import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * テストごとに独立したディレクトリを提供するフィクスチャ
 */
export const test = base.extend<{
  testWorkDir: string;
}>({
  testWorkDir: async ({}, use, testInfo) => {
    // ベースディレクトリを取得
    const pathFile = path.join(os.tmpdir(), '.config-doc-e2e-base-dir');
    let baseTestDir: string;

    if (fs.existsSync(pathFile)) {
      baseTestDir = fs.readFileSync(pathFile, 'utf-8').trim();
    } else {
      throw new Error('E2E base test directory not found. Global setup may have failed.');
    }

    // テストごとにユニークなサブディレクトリを作成
    const uniqueId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const testName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const testWorkDir = path.join(baseTestDir, `test-${testName}-${uniqueId}`);

    // ディレクトリを作成
    fs.mkdirSync(testWorkDir, { recursive: true });

    // sampleディレクトリをコピー（各テストが独立して変更可能）
    const sampleSrc = path.join(baseTestDir, 'sample');
    const sampleDest = path.join(testWorkDir, 'sample');

    if (fs.existsSync(sampleSrc)) {
      fs.cpSync(sampleSrc, sampleDest, { recursive: true });
    }

    // .config_docディレクトリを作成
    const configDocDir = path.join(testWorkDir, '.config_doc');
    fs.mkdirSync(configDocDir, { recursive: true });

    // テストに作業ディレクトリを提供
    await use(testWorkDir);

    // テスト終了後にクリーンアップ
    try {
      if (fs.existsSync(testWorkDir)) {
        fs.rmSync(testWorkDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Failed to cleanup test work directory ${testWorkDir}:`, error);
    }
  },
});

export { expect } from '@playwright/test';
