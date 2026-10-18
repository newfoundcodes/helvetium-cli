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

import { join } from 'node:path';
import { writeGenerated } from '../files.js';
import { camel, kebab, pascal } from '../names.js';
import type { TableGeneratorOptions } from '../interfaces/generators/table.js';

export async function generateTable(o: TableGeneratorOptions) {
  const table = kebab(o.name).replace(/-/g, '_');
  const singular = table.endsWith('s') ? table.slice(0, -1) : table;
  const typeName = pascal(singular);
  const constName = `${camel(table)}Table`;
  const file = join(o.projectRoot, 'src/database/tables', `${table}.ts`);
  await writeGenerated(
    file,
    `import { defineTable, types } from '@newfoundcodes/helvetium-alps';
    
export interface ${typeName}Record {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export const ${constName} = defineTable<${typeName}Record>(
  '${table}',
  {
    id: types.integer({ primaryKey: true }),
    createdAt: types.datetime(),
    updatedAt: types.datetime(),
  },
  { timestamps: true },
);\n`,
    o.force ?? false,
    o.dryRun ?? false,
  );
  return { file, table, constName, typeName };
}

export type { TableGeneratorOptions };
