import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['__tests__/unit/**/*.test.ts'],
    environment: 'node',
    // テストタイムアウトを設定（デフォルト5秒では短い場合がある）
    testTimeout: 10000,
    // フック用のセットアップファイル
    setupFiles: ['__tests__/unit/setup.ts'],
    // ファイル並列実行は維持（テストケースレベルで分離されているため安全）
    fileParallelism: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
