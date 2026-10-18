/*
 * Helvetium CLI - Helvetium Framework, A Newfoundcodes project.
 *
 * Copyright (C) 2026 Jonathan Eldy Baldivicio
 *
 * Author: Jonathan Eldy Baldivicio
 * Contact: jonathaneldy.baldivicio@newfoundcodes.com
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { PackageManager } from '@newfoundcodes/helvetium-boilerplate';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function findProjectRoot(start = process.cwd()): Promise<string | undefined> {
  let current = resolve(start);
  for (;;) {
    const pkg = join(current, 'package.json');
    if (await exists(pkg)) {
      try {
        const json = JSON.parse(await readFile(pkg, 'utf8')) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };

        const all = { ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}) };
        if (
          all['@newfoundcodes/helvetium-boot'] ||
          (await exists(join(current, 'src/routes/paths.ts')))
        ) {
          return current;
        }
      } catch {}
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

export async function requireProjectRoot(start = process.cwd()): Promise<string> {
  const root = await findProjectRoot(start);
  if (!root) {
    throw new Error('No Helvetium project found. Run this command inside a Helvetium application.');
  }

  return root;
}

export async function readPackage(
  root: string,
): Promise<{ name?: string; [key: string]: unknown }> {
  return JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
}

export async function detectPackageManager(root: string): Promise<PackageManager> {
  if (await exists(join(root, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (await exists(join(root, 'yarn.lock'))) {
    return 'yarn';
  }

  if ((await exists(join(root, 'bun.lockb'))) || (await exists(join(root, 'bun.lock')))) {
    return 'bun';
  }

  return 'npm';
}

export async function pathExists(path: string): Promise<boolean> {
  return exists(path);
}
