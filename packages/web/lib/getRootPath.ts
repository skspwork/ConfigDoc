import path from 'path';

/**
 * ユーザーの作業ディレクトリを取得します。
 * CLIから起動された場合は環境変数USER_WORKING_DIRを使用し、
 * 直接Next.jsを起動した場合は親ディレクトリを使用します。
 */
export function getRootPath(): string {
  // CLIから起動された場合、環境変数が設定されている
  if (process.env.USER_WORKING_DIR) {
    return process.env.USER_WORKING_DIR;
  }

  // 開発環境で直接Next.jsを起動した場合
  // packages/web から 2つ上の階層に移動
  return path.join(process.cwd(), '..', '..');
}
