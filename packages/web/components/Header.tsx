'use client';

import { DownloadIcon } from 'lucide-react';

interface HeaderProps {
  onExportClick: () => void;
}

export function Header({ onExportClick }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="ConfigDoc"
            className="w-12 h-12 rounded-lg"
          />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ConfigDoc
            </h1>
            <p className="text-xs text-gray-500">Configuration Documentation Tool</p>
          </div>
        </div>
        <button
          onClick={onExportClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200 transform"
          title="エクスポート"
        >
          <DownloadIcon className="w-5 h-5" />
          <span className="font-medium">エクスポート</span>
        </button>
      </div>
    </header>
  );
}
