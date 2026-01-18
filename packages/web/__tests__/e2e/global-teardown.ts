import { FullConfig } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  // ファイルからパスを読み込み
  const pathFile = path.join(os.tmpdir(), '.config-doc-test-dir');
  if (fs.existsSync(pathFile)) {
    const testDir = fs.readFileSync(pathFile, 'utf-8');

    // テストディレクトリを削除
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log(`[E2E Teardown] Test directory removed: ${testDir}`);
    }

    // パスファイルを削除
    fs.unlinkSync(pathFile);
  }
}

export default globalTeardown;
