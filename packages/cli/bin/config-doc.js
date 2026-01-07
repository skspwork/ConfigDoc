#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// ポートが利用可能かチェック
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// 空きポートを探す
async function findAvailablePort(startPort = 3000, endPort = 3100) {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${endPort}`);
}

// ブラウザを開く
function openBrowser(url) {
  const platform = process.platform;
  let command;

  if (platform === 'win32') {
    command = 'start';
  } else if (platform === 'darwin') {
    command = 'open';
  } else {
    command = 'xdg-open';
  }

  const child = spawn(command, [url], {
    shell: true,
    stdio: 'ignore',
    detached: true
  });
  child.unref();
}

// Next.jsサーバーが起動するまで待機
async function waitForServer(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          resolve(true);
        });
        req.on('error', reject);
        req.setTimeout(1000);
      });
      return true;
    } catch (err) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function main() {
  console.log('🚀 Starting ConfigDoc...');

  try {
    // 空きポートを探す
    const port = await findAvailablePort();
    console.log(`✓ Found available port: ${port}`);

    // Next.jsアプリのパスを取得
    const webAppPath = path.join(__dirname, '..', '..', 'web');

    // 環境変数を設定
    const env = {
      ...process.env,
      PORT: port.toString(),
      // ユーザーの作業ディレクトリを保存
      USER_WORKING_DIR: process.cwd(),
      NODE_ENV: 'production'
    };

    // Next.jsサーバーを起動
    console.log('🔧 Starting web server...');
    const nextProcess = spawn('node', [path.join(webAppPath, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', port.toString()], {
      cwd: webAppPath,
      env: env,
      stdio: 'inherit'
    });

    // サーバーが起動するまで待機
    console.log('⏳ Waiting for server to be ready...');
    const isReady = await waitForServer(port);

    if (!isReady) {
      console.error('❌ Server failed to start');
      process.exit(1);
    }

    // ブラウザを開く
    const url = `http://localhost:${port}`;
    console.log(`✓ Server is ready at ${url}`);
    console.log('🌐 Opening browser...');
    openBrowser(url);

    console.log('\n📝 ConfigDoc is running!');
    console.log('Press Ctrl+C to stop the server\n');

    // プロセス終了時の処理
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down ConfigDoc...');
      nextProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      nextProcess.kill('SIGTERM');
      process.exit(0);
    });

    nextProcess.on('exit', (code) => {
      console.log(`\n✓ ConfigDoc stopped`);
      process.exit(code || 0);
    });

  } catch (error) {
    console.error('❌ Error starting ConfigDoc:', error.message);
    process.exit(1);
  }
}

main();
