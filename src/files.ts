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

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function writeGenerated(
  path: string,
  content: string,
  force = false,
  dryRun = false,
): Promise<'created' | 'overwritten' | 'skipped'> {
  let exists = false;
  try {
    await readFile(path);
    exists = true;
  } catch {}

  if (exists && !force) {
    throw new Error(`File already exists: ${path}. Use --force to overwrite.`);
  }

  if (!dryRun) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
  }

  return exists ? 'overwritten' : 'created';
}

export async function editText(
  path: string,
  transform: (input: string) => string,
  dryRun = false,
): Promise<boolean> {
  const old = await readFile(path, 'utf8');
  const next = transform(old);

  if (next === old) {
    return false;
  }

  if (!dryRun) {
    await writeFile(path, next, 'utf8');
  }

  return true;
}

export function insertBefore(source: string, needle: string, text: string): string {
  const index = source.indexOf(needle);
  if (index < 0) {
    throw new Error(`Could not find scaffold insertion point: ${needle}`);
  }

  return `${source.slice(0, index)}${text}${source.slice(index)}`;
}
