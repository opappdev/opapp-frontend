import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const appRoot = path.join(repoRoot, 'apps', 'companion-app');
const reactNativeBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'react-native.cmd' : 'react-native',
);
const startArgs = ['start', '--config', 'metro.config.js', '--port', '8081'];

const env = {
  ...process.env,
  REACT_NATIVE_APP_ROOT: appRoot,
};

const command = process.platform === 'win32' ? 'cmd.exe' : reactNativeBin;
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', reactNativeBin, ...startArgs]
  : startArgs;

const result = spawnSync(command, args, {
  cwd: appRoot,
  env,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
