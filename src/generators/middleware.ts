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
import { camel, kebab } from '../names.js';
import type { MiddlewareGeneratorOptions } from '../interfaces/generators/middleware.js';

export async function generateMiddleware(o: MiddlewareGeneratorOptions) {
  const exportName = `${camel(o.name)}Middleware`;
  const file = join(o.projectRoot, 'src/middlewares', `${kebab(o.name)}.ts`);

  await writeGenerated(
    file,
    `import type { Middleware } from '@newfoundcodes/helvetium-boot';

export const ${exportName}: Middleware = async (c, next) => {
  // Add pre-handler logic here.
  const response = await next();

  // Add post-handler logic here.
  return response;
};\n`,
    o.force ?? false,
    o.dryRun ?? false,
  );
  return { file, exportName };
}

export type { MiddlewareGeneratorOptions };
