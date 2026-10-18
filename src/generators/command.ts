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
import { kebab } from '../names.js';
import type { CommandGeneratorOptions } from '../interfaces/generators/command.js';

export async function generateCommand(o: CommandGeneratorOptions) {
  const commandName = o.name.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9:_-]*$/.test(commandName)) {
    throw new TypeError(`Invalid command name: ${o.name}`);
  }

  const fileName = kebab(commandName.replace(/:/g, '-'));
  const file = join(o.projectRoot, '.helvetium/commands', `${fileName}.mjs`);

  await writeGenerated(
    file,
    `export default {
  name: '${commandName}',
  description: 'Custom Helvetium command',
  async run(context) {
    context.io.write('Hello from ${commandName}');
    return 0;
  },
};\n`,
    o.force ?? false,
    o.dryRun ?? false,
  );
  return { file, name: commandName };
}

export type { CommandGeneratorOptions };
