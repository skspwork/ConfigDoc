import { FullConfig } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  // ファイルからパスを読み込み
  const pathFile = path.join(os.tmpdir(), '.config-doc-e2e-base-dir');

  if (fs.existsSync(pathFile)) {
    const baseTestDir = fs.readFileSync(pathFile, 'utf-8').trim();

    // ベースディレクトリとすべてのサブディレクトリを削除
    if (baseTestDir && fs.existsSync(baseTestDir)) {
      fs.rmSync(baseTestDir, { recursive: true, force: true });
      console.log(`[E2E Teardown] Base test directory removed: ${baseTestDir}`);
    }

    // パスファイルを削除
    fs.unlinkSync(pathFile);
  }

  // 残骸がないかチェック（念のため）
  try {
    const tmpDir = os.tmpdir();
    const entries = fs.readdirSync(tmpDir);
    const staleDirs = entries.filter(entry =>
      entry.startsWith('config-doc-e2e-') &&
      fs.statSync(path.join(tmpDir, entry)).isDirectory()
    );

    for (const staleDir of staleDirs) {
      const fullPath = path.join(tmpDir, staleDir);
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`[E2E Teardown] Removed stale directory: ${staleDir}`);
    }
  } catch (error) {
    console.warn('[E2E Teardown] Failed to cleanup stale directories:', error);
  }
}

export default globalTeardown;
