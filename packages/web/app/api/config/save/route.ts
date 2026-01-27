import { NextRequest, NextResponse } from 'next/server';
import { FileSystemService } from '@/lib/fileSystem';
import { StorageService } from '@/lib/storage';
import { getRootPath } from '@/lib/getRootPath';
import { normalizeToTemplatePath, getTemplatePathForConcrete } from '@/lib/templatePath';
import { AssociativeArrayMapping } from '@/types';

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
    const { configFilePath, propertyPath, propertyDoc, properties, associativeArrays, configData } = body;

    // configFilePathは必須
    if (!configFilePath) {
      return NextResponse.json(
        { success: false, error: 'Missing configFilePath' },
        { status: 400 }
      );
    }

    // プロジェクトのルートパス（ユーザーの作業ディレクトリ）
    const rootPath = getRootPath();
    const fsService = new FileSystemService(rootPath);
    const storageService = new StorageService(fsService);

    // .config_docディレクトリを確保
    await fsService.ensureConfigDocDir();

    // 一括更新モード（propertiesが指定されている場合）
    if (properties) {
      await storageService.updateAllProperties(configFilePath, properties);
    } else if (propertyPath && propertyDoc) {
      // 単一プロパティ更新モード
      // テンプレートとして保存する場合は、パスを正規化して保存
      let savePath = propertyPath;
      const docToSave = { ...propertyDoc };
      const mappings: AssociativeArrayMapping[] = associativeArrays || [];

      if (propertyDoc.isTemplate) {
        // 連想配列も考慮してテンプレートパスに変換
        if (mappings.length > 0 && configData) {
          // 連想配列のキー名もワイルドカードに変換
          savePath = getTemplatePathForConcrete(propertyPath, mappings, configData);
        } else {
          // 配列インデックスのみワイルドカードに変換
          savePath = normalizeToTemplatePath(propertyPath);
        }
        docToSave.path = savePath;
        // テンプレート作成元の具体的パスを記録（追跡用）
        docToSave.sourceTemplatePath = propertyPath;

        // 直接パスのドキュメントが存在する場合は削除（古いデータが残らないように）
        const docs = await storageService.loadAllDocs(configFilePath);
        if (docs.properties[propertyPath]) {
          await storageService.deletePropertyDoc(configFilePath, propertyPath);
        }
      } else {
        // テンプレートではない場合、既存のテンプレートドキュメントを削除
        // このパスがsourceTemplatePathとして記録されているテンプレートを探して削除
        const docs = await storageService.loadAllDocs(configFilePath);
        for (const [docPath, doc] of Object.entries(docs.properties)) {
          if (doc.isTemplate && doc.sourceTemplatePath === propertyPath) {
            await storageService.deletePropertyDoc(configFilePath, docPath);
            break;
          }
        }
        // sourceTemplatePathをクリア
        delete docToSave.sourceTemplatePath;
      }

      await storageService.savePropertyDoc(
        configFilePath,
        savePath,
        docToSave
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: either (propertyPath, propertyDoc) or properties required' },
        { status: 400 }
      );
    }

    // メタデータの最終更新時刻を更新
    const metadata = await fsService.loadConfigFiles();
    if (metadata) {
      metadata.lastModified = new Date().toISOString();
      await fsService.saveConfigFiles(metadata);
    }

    return NextResponse.json({
      success: true,
      message: 'ドキュメントを保存しました'
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
