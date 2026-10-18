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
import { editText, insertBefore, writeGenerated } from '../files.js';
import { camel, snake } from '../names.js';
import type { MigrationGeneratorOptions } from '../interfaces/generators/migration.js';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function migrationTimestamp(date = new Date()): string {
  return `${pad(date.getMonth() + 1)}${pad(date.getDate())}${date.getFullYear()}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export async function generateMigration(o: MigrationGeneratorOptions) {
  const base = snake(o.name);
  const stamp = migrationTimestamp(o.now);
  const id = `${stamp}_${base}`;
  const file = join(o.projectRoot, 'migrations', `${id}.ts`);
  const table = o.create ?? o.table ?? /^create_(.+?)(?:_table)?$/.exec(base)?.[1];

  let body: string;
  if (o.create || (/^create_/.test(base) && table)) {
    const tableName = table!;
    body = `import { defineMigration, defineTable, types } from '@newfoundcodes/helvetium-alps';

const table = defineTable('${tableName}', {
  id: types.integer({ primaryKey: true }),
  createdAt: types.datetime(),
  updatedAt: types.datetime(),
}, { timestamps: true });

export default defineMigration('${id}', {
  up({ schema }) {
    schema.createTable(table, { ifNotExists: true });
  },
  down({ schema }) {
    schema.dropTable('${tableName}');
  },
});\n`;
  } else if (o.table) {
    body = `import { defineMigration } from '@newfoundcodes/helvetium-alps';

export default defineMigration('${id}', {
  up({ schema }) {
    schema.addColumn('${o.table}', 'new_column', 'TEXT', { nullable: true });
  },
  down({ schema }) {
    schema.dropColumn('${o.table}', 'new_column');
  },
});\n`;
  } else {
    body = `import { defineMigration } from '@newfoundcodes/helvetium-alps';

export default defineMigration('${id}', {
  up({ schema }) {
    // Add schema operations here.
  },
  down({ schema }) {
    // Add rollback operations here.
  },
});\n`;
  }

  await writeGenerated(file, body, o.force ?? false, o.dryRun ?? false);

  const registry = join(o.projectRoot, 'scripts/migrations.ts');
  const importName = `${camel(base)}_${stamp.replace(/[^0-9]/g, '')}Migration`;

  await editText(
    registry,
    (source) => {
      if (source.includes(`../migrations/${id}.js`)) {
        return source;
      }

      let next = insertBefore(
        source,
        'export const migrations',
        `import ${importName} from '../migrations/${id}.js';\n`,
      );
      next = next.replace(
        /export const migrations\s*=\s*\[([^\]]*)\]/s,
        (_m: string, inside: string) => {
          const cleaned = inside.trim();
          return `export const migrations=[${cleaned ? `${cleaned.replace(/,?\s*$/, '')},` : ''}${importName}]`;
        },
      );
      return next;
    },
    o.dryRun ?? false,
  );
  return { file, id, table };
}

export type { MigrationGeneratorOptions };
