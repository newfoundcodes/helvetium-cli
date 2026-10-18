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

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathExists } from './project.js';

function parse(content: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const index = line.indexOf('=');
    if (index < 0) {
      continue;
    }

    m.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }

  return m;
}

export async function checkEnvironment(
  root: string,
): Promise<{ required: string[]; present: string[]; missing: string[] }> {
  const example = join(root, '.env.example');
  if (!(await pathExists(example))) {
    return { required: [], present: [], missing: [] };
  }

  const required = [...parse(await readFile(example, 'utf8')).keys()];
  const envFile = join(root, '.env');
  const values = (await pathExists(envFile))
    ? parse(await readFile(envFile, 'utf8'))
    : new Map<string, string>();

  const present = required.filter((k) => Boolean(process.env[k] ?? values.get(k)));
  return { required, present, missing: required.filter((k) => !present.includes(k)) };
}
