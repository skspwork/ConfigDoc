import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * E2Eテスト用の一時ディレクトリパスを取得します。
 * global-setup.tsで作成されたパスファイルから読み込みます。
 */
function getE2ETestDir(): string | null {
  try {
    const pathFile = path.join(os.tmpdir(), '.config-doc-test-dir');
    if (fs.existsSync(pathFile)) {
      const testDir = fs.readFileSync(pathFile, 'utf-8').trim();
      if (testDir && fs.existsSync(testDir)) {
        return testDir;
      }
    }
  } catch {
    // ファイル読み込みエラーは無視
  }
  return null;
}

/**
 * ユーザーの作業ディレクトリを取得します。
 * E2Eテスト環境では一時ディレクトリを使用し、
 * CLIから起動された場合は環境変数USER_WORKING_DIRを使用し、
 * 直接Next.jsを起動した場合は親ディレクトリを使用します。
 */
export function getRootPath(): string {
  // E2Eテスト環境の場合（一時ディレクトリを使用）
  const e2eTestDir = getE2ETestDir();
  if (e2eTestDir) {
    return e2eTestDir;
  }

  // CLIから起動された場合、環境変数が設定されている
  if (process.env.USER_WORKING_DIR) {
    return process.env.USER_WORKING_DIR;
  }

  // 開発環境で直接Next.jsを起動した場合
  // packages/web から 2つ上の階層に移動
  return path.join(process.cwd(), '..', '..');
}
