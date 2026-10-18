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
import type { RouteInfo } from './interfaces/routes.js';

export async function inspectRoutes(root: string): Promise<RouteInfo[]> {
  const source = await readFile(join(root, 'src/routes/paths.ts'), 'utf8');
  const out: RouteInfo[] = [];
  const re = /app\.(get|post|put|patch|delete|options|head|all)\s*\(\s*['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    out.push({ method: match[1]!.toUpperCase(), path: match[2]! });
  }

  return out;
}

export type { RouteInfo };
