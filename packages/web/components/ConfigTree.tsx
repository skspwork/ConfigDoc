'use client';

import { useState } from 'react';
import { ConfigTreeNode, ConfigDocs, AssociativeArrayMapping, PropertyDoc } from '@/types';
import { ChevronRightIcon, ChevronDownIcon, FileTextIcon, LayersIcon, ListIcon } from 'lucide-react';
import { ConfigParser } from '@/lib/configParser';
import { findTemplateForPath, convertToWildcardBasePath } from '@/lib/templatePath';

interface ConfigTreeProps {
  config: any;
  docs: ConfigDocs;
  onSelectProperty: (path: string) => void;
  onEditProperty: (path: string) => void;
  selectedPath?: string;
  associativeArrays?: AssociativeArrayMapping[];
}

export function ConfigTree({
  config,
  docs,
  onSelectProperty,
  onEditProperty,
  selectedPath,
  associativeArrays = []
}: ConfigTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  // すべてのノードパスを収集
  const getAllNodePaths = (nodes: ConfigTreeNode[]): string[] => {
    const paths: string[] = [];
    const collectPaths = (node: ConfigTreeNode) => {
      if (node.children && node.children.length > 0) {
        paths.push(node.fullPath);
        node.children.forEach(collectPaths);
      }
    };
    nodes.forEach(collectPaths);
    return paths;
  };

  // すべて展開
  const expandAll = () => {
    const tree = ConfigParser.buildTree(config);
    const allPaths = getAllNodePaths(tree);
    setExpandedNodes(new Set(allPaths));
  };

  // すべて閉じる
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // パスがテンプレートのソースパスかどうかチェック
  const isTemplateSourcePath = (path: string): boolean => {
    // すべてのテンプレートドキュメントをチェック
    for (const doc of Object.values(docs.properties)) {
      if (doc.isTemplate && doc.sourceTemplatePath === path) {
        return true;
      }
    }
    return false;
  };

  // ドキュメントが有効な内容を持っているかチェック（テンプレートも考慮）
  const hasValidDocumentation = (path: string): { hasDirectDoc: boolean; hasDoc: boolean; isTemplate: boolean; isInherited: boolean; isTemplateSource: boolean } => {
    // このパスがテンプレートの作成元かチェック
    const isSource = isTemplateSourcePath(path);

    // 直接ドキュメントを確認
    const directDoc = docs.properties[path];
    const hasDirectContent = directDoc ? checkDocContent(directDoc) : false;

    // テンプレートドキュメントを検索（直接ドキュメントは除外してテンプレートのみ検索）
    const templateDoc = findTemplateForPath(
      path,
      docs.properties as Record<string, PropertyDoc>,
      associativeArrays,
      config
    );
    const hasTemplateContent = templateDoc ? checkDocContent(templateDoc) : false;

    // 直接ドキュメントがある場合
    if (directDoc) {
      if (hasDirectContent) {
        // 直接ドキュメントがテンプレートとしてマークされているか
        // テンプレートからの継承もチェック（直接ドキュメント以外のテンプレートがあるか）
        const isInheritedFromTemplate = hasTemplateContent && templateDoc !== directDoc && !isSource;
        return {
          hasDirectDoc: true,
          hasDoc: true,
          isTemplate: directDoc.isTemplate || false,
          isInherited: isInheritedFromTemplate,
          isTemplateSource: isSource
        };
      }
      // コンテンツがなくてもisTemplateフラグがあればテンプレートとして表示
      if (directDoc.isTemplate) {
        return { hasDirectDoc: false, hasDoc: false, isTemplate: true, isInherited: false, isTemplateSource: isSource };
      }
    }

    // 直接ドキュメントがない場合、テンプレートから継承
    if (hasTemplateContent) {
      // テンプレートから継承されたドキュメント
      // ただし、このパスがテンプレート元の場合はisTemplateSourceをtrueにする
      return { hasDirectDoc: false, hasDoc: true, isTemplate: false, isInherited: !isSource, isTemplateSource: isSource };
    }

    return { hasDirectDoc: false, hasDoc: false, isTemplate: false, isInherited: false, isTemplateSource: isSource };
  };

  // ドキュメントの内容があるかチェック
  const checkDocContent = (doc: PropertyDoc): boolean => {
    // タグがあるか
    if (doc.tags && doc.tags.length > 0) return true;

    // フィールドに値があるか
    if (doc.fields) {
      const hasFieldValue = Object.values(doc.fields).some(
        value => value && value.trim() !== ''
      );
      if (hasFieldValue) return true;
    }

    return false;
  };

  // パスが連想配列として登録されているかチェック（ワイルドカードマッピングも対応）
  const isAssociativeArrayPath = (path: string): boolean => {
    // 直接一致をチェック
    if (associativeArrays.some(mapping => mapping.basePath === path)) {
      return true;
    }

    // ワイルドカード化されたパスでチェック
    const wildcardedPath = convertToWildcardBasePath(path, associativeArrays, config);
    if (wildcardedPath !== path && associativeArrays.some(mapping => mapping.basePath === wildcardedPath)) {
      return true;
    }

    // ワイルドカードマッピングとのマッチをチェック
    return associativeArrays.some(mapping => {
      if (!mapping.basePath.includes('[*]')) return false;
      // ワイルドカードパスを正規表現に変換
      // 例: AppSettings:Fields[*]:Contents:Map → AppSettings:Fields:[^:]+:Contents:Map
      const regexPattern = mapping.basePath
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // 特殊文字をエスケープ
        .replace(/\\\[\\\*\\\]/g, ':[^:]+');     // [*] を :[^:]+ に変換
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    });
  };

  const renderNode = (node: ConfigTreeNode, depth: number = 0) => {
    const docStatus = hasValidDocumentation(node.fullPath);
    const isExpanded = expandedNodes.has(node.fullPath);
    const isSelected = selectedPath === node.fullPath;
    const isAssocArray = isAssociativeArrayPath(node.fullPath);

    return (
      <div key={node.fullPath}>
        <div
          style={{ paddingLeft: `${depth * 20}px` }}
          className={`group flex items-center gap-2 py-2 px-3 cursor-pointer rounded-lg transition-all duration-150 ${
            isSelected
              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-blue-500 shadow-sm'
              : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
          }`}
        >
          {node.children && node.children.length > 0 ? (
            <button
              onClick={() => toggleNode(node.fullPath)}
              className="p-1 hover:bg-blue-100 rounded-md transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div
            onClick={() => onSelectProperty(node.fullPath)}
            className="flex-1 flex items-center gap-2"
          >
            <span className={`${node.children ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>
              {node.key}
            </span>
            {!node.children && (
              <span className="text-sm text-gray-500 truncate max-w-[200px]">
                : {JSON.stringify(node.value)}
              </span>
            )}
            {/* ドキュメントバッジ（直接ドキュメントがあり、テンプレート元でない場合） */}
            {docStatus.hasDirectDoc && !docStatus.isTemplate && !docStatus.isTemplateSource && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 border border-green-300 rounded-full">
                <FileTextIcon className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-700 font-medium">Doc</span>
              </div>
            )}
            {/* テンプレートバッジ（テンプレートパスに直接保存されたもの、またはテンプレート元のパス） */}
            {(docStatus.isTemplate || docStatus.isTemplateSource) && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 border border-purple-300 rounded-full">
                <LayersIcon className="w-3 h-3 text-purple-600" />
                <span className="text-xs text-purple-700 font-medium">Template</span>
              </div>
            )}
            {/* 継承バッジ（テンプレートから継承、テンプレート元でない場合。直接Docと両方表示可能） */}
            {docStatus.isInherited && !docStatus.isTemplateSource && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 border border-blue-300 rounded-full">
                <FileTextIcon className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Inherited</span>
              </div>
            )}
            {/* 連想配列バッジ */}
            {isAssocArray && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full">
                <ListIcon className="w-3 h-3 text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">連想配列</span>
              </div>
            )}
          </div>

          {!node.children && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditProperty(node.fullPath);
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="編集"
            />
          )}
        </div>

        {node.children && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = ConfigParser.buildTree(config);

  return (
    <div className="h-full flex flex-col border-2 border-gray-100 rounded-xl bg-white shadow-sm">
      {/* ツールバー */}
      <div className="flex items-center gap-2 p-3 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
        <button
          onClick={expandAll}
          className="px-4 py-1.5 text-sm font-medium bg-white border-2 border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          すべて展開
        </button>
        <button
          onClick={collapseAll}
          className="px-4 py-1.5 text-sm font-medium bg-white border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          すべて閉じる
        </button>
      </div>

      {/* ツリー表示 */}
      <div className="flex-1 overflow-y-auto p-3">
        {tree.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
