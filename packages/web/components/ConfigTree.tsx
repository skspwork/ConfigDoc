'use client';

import { useState } from 'react';
import { ConfigTreeNode, ConfigDocs } from '@/types';
import { ChevronRightIcon, ChevronDownIcon, FileTextIcon } from 'lucide-react';
import { ConfigParser } from '@/lib/configParser';

interface ConfigTreeProps {
  config: any;
  docs: ConfigDocs;
  onSelectProperty: (path: string) => void;
  onEditProperty: (path: string) => void;
  selectedPath?: string;
}

export function ConfigTree({
  config,
  docs,
  onSelectProperty,
  onEditProperty,
  selectedPath
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

  const renderNode = (node: ConfigTreeNode, depth: number = 0) => {
    const hasDoc = docs.properties[node.fullPath] !== undefined;
    const isExpanded = expandedNodes.has(node.fullPath);
    const isSelected = selectedPath === node.fullPath;

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
            {hasDoc && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 border border-green-300 rounded-full">
                <FileTextIcon className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-700 font-medium">Doc</span>
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
