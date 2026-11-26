import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveYarnPath(root = process.cwd()) {
  const configPath = resolve(root, '.yarnrc.yml');
  const config = readFileSync(configPath, 'utf8');
  const line = config.split(/\r?\n/).find(candidate => /^\s*yarnPath\s*:/.test(candidate));
  if (!line) throw new Error(`No yarnPath is configured in ${configPath}`);

  let configuredPath = line.replace(/^\s*yarnPath\s*:\s*/, '').trim();
  const quote = configuredPath[0];
  if (quote === '"' || quote === "'") {
    const closingQuote = configuredPath.lastIndexOf(quote);
    const trailing = configuredPath.slice(closingQuote + 1).trim();
    if (closingQuote <= 0 || (trailing && !trailing.startsWith('#'))) {
      throw new Error(`The yarnPath in ${configPath} is malformed`);
    }
    configuredPath = configuredPath.slice(1, closingQuote);
  } else {
    configuredPath = configuredPath.replace(/\s+#.*$/, '').trim();
  }
  if (!configuredPath) throw new Error(`The yarnPath in ${configPath} is empty`);

  const yarnPath = isAbsolute(configuredPath) ? configuredPath : resolve(root, configuredPath);
  if (!existsSync(yarnPath)) throw new Error(`The configured Yarn release does not exist: ${configuredPath}`);
  return yarnPath;
}

export function runCoreYarn(args, root = process.cwd()) {
  const yarnPath = resolveYarnPath(root);
  const result = spawnSync(process.execPath, [yarnPath, ...args], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = runCoreYarn(process.argv.slice(2));
  } catch (error) {
    console.error(`Unable to run the configured Yarn release: ${error.message}`);
    process.exitCode = 1;
  }
}
