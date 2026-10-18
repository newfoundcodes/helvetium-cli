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

import { generateMigration } from './migration.js';
import { generateRepository } from './repository.js';
import { generateTable } from './table.js';
import { kebab } from '../names.js';
import type { ModelGeneratorOptions } from '../interfaces/generators/model.js';

export type { ModelGeneratorOptions };
export async function generateModel(o: ModelGeneratorOptions) {
  const tableName =
    kebab(o.name).replace(/-/g, '_') + (o.name.toLowerCase().endsWith('s') ? '' : 's');

  const table = await generateTable({
    name: tableName,
    projectRoot: o.projectRoot,
    ...(o.force === undefined ? {} : { force: o.force }),
    ...(o.dryRun === undefined ? {} : { dryRun: o.dryRun }),
  });

  const repository = await generateRepository({
    name: o.name,
    projectRoot: o.projectRoot,
    ...(o.force === undefined ? {} : { force: o.force }),
    ...(o.dryRun === undefined ? {} : { dryRun: o.dryRun }),
  });

  const migration = o.migration
    ? await generateMigration({
        name: `create_${tableName}`,
        projectRoot: o.projectRoot,
        create: tableName,
        ...(o.force === undefined ? {} : { force: o.force }),
        ...(o.dryRun === undefined ? {} : { dryRun: o.dryRun }),
      })
    : undefined;
  return { table, repository, ...(migration ? { migration } : {}) };
}
