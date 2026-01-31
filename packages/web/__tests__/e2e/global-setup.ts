import { FullConfig } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // ベースとなる一時ディレクトリを作成（各テストがサブディレクトリを作成）
  const baseTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-doc-e2e-base-'));

  // 環境変数に保存（teardownで使用）
  process.env.E2E_BASE_TEST_DIR = baseTestDir;

  // sampleディレクトリをベースディレクトリにコピー（全テストで共有・読み取り専用）
  const sampleSrc = path.join(process.cwd(), '..', '..', 'sample');
  const sampleDest = path.join(baseTestDir, 'sample');

  if (fs.existsSync(sampleSrc)) {
    fs.cpSync(sampleSrc, sampleDest, { recursive: true });
  }

  // パスをファイルに保存（プロセス間共有用）
  const pathFile = path.join(os.tmpdir(), '.config-doc-e2e-base-dir');
  fs.writeFileSync(pathFile, baseTestDir);

  console.log(`[E2E Setup] Base test directory created: ${baseTestDir}`);
}

export default globalSetup;
