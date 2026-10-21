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

import { spawn } from 'node:child_process';
import type { PackageManager } from '@newfoundcodes/helvetium-boilerplate';

const windowsExecutables: Record<string, string> = {
  npm: 'npm.cmd',
  pnpm: 'pnpm.cmd',
  yarn: 'yarn.cmd',
  bun: 'bun.exe',
};

export function platformExecutable(command: string, platform = process.platform): string {
  return platform === 'win32' ? (windowsExecutables[command] ?? command) : command;
}

export async function runProcess(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined> = {},
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(platformExecutable(command), args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });

    child.on('error', reject);
    child.on('exit', (code: number | null) => resolve(code ?? 1));
  });
}

export function scriptInvocation(
  manager: PackageManager,
  script: string,
  extra: string[] = [],
): { command: string; args: string[] } {
  if (manager === 'npm') {
    return { command: 'npm', args: ['run', script, ...(extra.length ? ['--', ...extra] : [])] };
  }

  if (manager === 'pnpm') {
    return { command: 'pnpm', args: ['run', script, ...extra] };
  }

  if (manager === 'yarn') {
    return { command: 'yarn', args: [script, ...extra] };
  }

  return { command: 'bun', args: ['run', script, ...extra] };
}
