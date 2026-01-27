import { NextRequest, NextResponse } from 'next/server';
import { FileSystemService } from '@/lib/fileSystem';
import { StorageService } from '@/lib/storage';
import { getRootPath } from '@/lib/getRootPath';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const { configFilePath, propertyPath } = body;

    // configFilePathとpropertyPathは必須
    if (!configFilePath || !propertyPath) {
      return NextResponse.json(
        { success: false, error: 'Missing configFilePath or propertyPath' },
        { status: 400 }
      );
    }

    // プロジェクトのルートパス（ユーザーの作業ディレクトリ）
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const storageService = new StorageService(fsService);

    // 直接パスのドキュメントを削除
    await storageService.deletePropertyDoc(configFilePath, propertyPath);

    // このパスがsourceTemplatePathとして記録されているテンプレートを探して削除
    const docs = await storageService.loadAllDocs(configFilePath);
    for (const [docPath, doc] of Object.entries(docs.properties)) {
      if (doc.isTemplate && doc.sourceTemplatePath === propertyPath) {
        await storageService.deletePropertyDoc(configFilePath, docPath);
        break;
      }
    }

    // メタデータの最終更新時刻を更新
    const metadata = await fsService.loadConfigFiles();
    if (metadata) {
      metadata.lastModified = new Date().toISOString();
      await fsService.saveConfigFiles(metadata);
    }

    return NextResponse.json({
      success: true,
      message: 'プロパティ詳細を削除しました'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
