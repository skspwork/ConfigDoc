#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Paths
const webRoot = path.join(__dirname, '..', 'packages', 'web');
const standaloneRoot = path.join(webRoot, '.next', 'standalone');
const staticSource = path.join(webRoot, '.next', 'static');
const staticDest = path.join(standaloneRoot, '.next', 'static');
const publicSource = path.join(webRoot, 'public');
const publicDest = path.join(standaloneRoot, 'public');

console.log('📦 Preparing standalone build...');

// Copy .next/static to standalone/.next/static
if (fs.existsSync(staticSource)) {
  console.log('  → Copying .next/static to standalone...');
  copyRecursiveSync(staticSource, staticDest);
} else {
  console.warn('  ⚠️  Warning: .next/static not found');
}

// Copy public to standalone/public
if (fs.existsSync(publicSource)) {
  console.log('  → Copying public to standalone...');
  copyRecursiveSync(publicSource, publicDest);
} else {
  console.warn('  ⚠️  Warning: public directory not found');
}

console.log('✅ Standalone build prepared successfully!');
console.log(`   Server location: ${path.join(standaloneRoot, 'server.js')}`);

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
