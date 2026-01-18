import { FullConfig } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // 一時ディレクトリを作成
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-doc-test-'));

  // 環境変数に保存（teardownとAPIルートで使用）
  process.env.TEST_CONFIG_DOC_DIR = testDir;

  // sampleディレクトリをコピー（テストで必要）
  const sampleSrc = path.join(process.cwd(), '..', '..', 'sample');
  const sampleDest = path.join(testDir, 'sample');
  fs.cpSync(sampleSrc, sampleDest, { recursive: true });

  // パスをファイルに保存（プロセス間共有用）
  fs.writeFileSync(path.join(os.tmpdir(), '.config-doc-test-dir'), testDir);

  console.log(`[E2E Setup] Test directory created: ${testDir}`);
}

export default globalSetup;
