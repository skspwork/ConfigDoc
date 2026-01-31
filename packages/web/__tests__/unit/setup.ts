import { afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 全テスト終了後のクリーンアップ
 * テストがクラッシュして残った一時ディレクトリを削除
 */
afterAll(() => {
  try {
    const tmpDir = os.tmpdir();
    const entries = fs.readdirSync(tmpDir);

    // config-doc-test-で始まるディレクトリを検出
    const testDirs = entries.filter(entry =>
      entry.startsWith('config-doc-test-') &&
      fs.statSync(path.join(tmpDir, entry)).isDirectory()
    );

    // 見つかったテストディレクトリを削除
    for (const testDir of testDirs) {
      const fullPath = path.join(tmpDir, testDir);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`[Cleanup] Removed stale test directory: ${testDir}`);
      } catch (error) {
        console.warn(`[Cleanup] Failed to remove ${testDir}:`, error);
      }
    }
  } catch (error) {
    // クリーンアップエラーは警告のみ
    console.warn('[Cleanup] Failed to cleanup stale test directories:', error);
  }
});
