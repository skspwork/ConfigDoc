import { describe, test, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '@/lib/storage';
import { FileSystemService } from '@/lib/fileSystem';

// FileSystemServiceのモック
const createMockFsService = (rootPath: string = '/project') => {
  return {
    rootPath,
    loadConfigDocs: vi.fn(),
    saveConfigDocs: vi.fn(),
  } as unknown as FileSystemService;
};

describe('StorageService', () => {
  describe('getDocsFileName', () => {
    test('ルート直下のファイルは.docs.jsonに変換される', () => {
      const mockFs = createMockFsService('/project');
      const storage = new StorageService(mockFs);

      const result = storage.getDocsFileName('appsettings.json');
      expect(result).toBe('appsettings.docs.json');
    });

    test('サブディレクトリのファイルはパスを含めて変換される', () => {
      const mockFs = createMockFsService('/project');
      const storage = new StorageService(mockFs);

      const result = storage.getDocsFileName('sample/appsettings.json');
      expect(result).toBe('sample_appsettings.docs.json');
    });

    test('深いパスのファイルも正しく変換される', () => {
      const mockFs = createMockFsService('/project');
      const storage = new StorageService(mockFs);

      const result = storage.getDocsFileName('config/env/development.json');
      expect(result).toBe('config_env_development.docs.json');
    });

    test('親ディレクトリ参照(..)はアンダースコア2つに変換される', () => {
      const mockFs = createMockFsService('/project');
      const storage = new StorageService(mockFs);

      const result = storage.getDocsFileName('../other/config.json');
      expect(result).toBe('___other_config.docs.json');
    });

    test('Windowsスタイルのパス区切りも処理される', () => {
      const mockFs = createMockFsService('/project');
      const storage = new StorageService(mockFs);

      const result = storage.getDocsFileName('config\\settings.json');
      expect(result).toBe('config_settings.docs.json');
    });

    test('カレントディレクトリ(./)は無視される', () => {
      const mockFs = createMockFsService('/project');
      const storage = new StorageService(mockFs);

      const result = storage.getDocsFileName('./config.json');
      expect(result).toBe('config.docs.json');
    });

    test('複数の拡張子を持つファイルも正しく処理される', () => {
      const mockFs = createMockFsService('/project');
      const storage = new StorageService(mockFs);

      const result = storage.getDocsFileName('config.prod.json');
      expect(result).toBe('config.prod.docs.json');
    });
  });
});
