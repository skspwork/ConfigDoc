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
          className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100' : ''
          }`}
        >
          {node.children && node.children.length > 0 ? (
            <button
              onClick={() => toggleNode(node.fullPath)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <div
            onClick={() => onSelectProperty(node.fullPath)}
            className="flex-1 flex items-center gap-2"
          >
            <span className={node.children ? 'font-semibold' : ''}>
              {node.key}
            </span>
            {!node.children && (
              <span className="text-sm text-gray-500">
                : {JSON.stringify(node.value)}
              </span>
            )}
            {hasDoc && <FileTextIcon className="w-4 h-4 text-green-500" />}
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
    <div className="h-full flex flex-col border rounded-lg bg-white">
      {/* ツールバー */}
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
        <button
          onClick={expandAll}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          すべて展開
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          すべて閉じる
        </button>
      </div>

      {/* ツリー表示 */}
      <div className="flex-1 overflow-y-auto p-2">
        {tree.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
