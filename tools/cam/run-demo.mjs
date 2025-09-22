#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const artifactsDir = resolve(root, 'artifacts', 'demo');
mkdirSync(artifactsDir, { recursive: true });

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: root,
    ...options,
  });
  if (result.status !== 0) {
    const message = result.error ? result.error.message : `command failed: ${cmd} ${args.join(' ')}`;
    throw new Error(message);
  }
}

function pythonExecutable() {
  if (process.env.PYTHON) {
    return process.env.PYTHON;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

run('cargo', ['run', '-p', 'cam', '--example', 'demo_post']);

const gcodePath = resolve(artifactsDir, 'demo_post.nc');
const svgPath = resolve(artifactsDir, 'demo_post_preview.svg');
run(pythonExecutable(), ['tools/sim/render_gcode.py', gcodePath, svgPath]);

console.log(`Preview available at ${svgPath}`);
