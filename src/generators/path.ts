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
import { editText, insertBefore } from '../files.js';
import { camel, kebab } from '../names.js';
import { generateHandler } from './handler.js';
import type { HTTPMethod } from '../types/generators/path.js';
import type { PathGeneratorOptions } from '../interfaces/generators/path.js';

export async function generatePath(o: PathGeneratorOptions) {
  const method = (o.method ?? 'get').toLowerCase() as HTTPMethod;
  if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
    throw new TypeError(`Unsupported HTTP method: ${method}`);
  }

  const routePath = o.path ?? `/api/${kebab(o.name)}`;
  const handlerBase = o.handler ?? o.name;
  const handler = await generateHandler({
    name: handlerBase,
    projectRoot: o.projectRoot,
    ...(o.force === undefined ? {} : { force: o.force }),
    ...(o.dryRun === undefined ? {} : { dryRun: o.dryRun }),
  });
  const paths = join(o.projectRoot, 'src/routes/paths.ts');

  await editText(
    paths,
    (source) => {
      if (source.includes(`'${routePath}'`) || source.includes(`"${routePath}"`)) {
        throw new Error(`Route already exists: ${routePath}`);
      }

      const importLine = `import { ${handler.exportName} } from './handlers/${kebab(handlerBase)}.js';\n`;
      let next = source.includes(importLine)
        ? source
        : insertBefore(source, 'export { pageRoutes }', importLine);
      const anchor = "  app.get(\n    '/openapi.json'";
      const route = `  app.${method}(
    '${routePath}',
    describeRoute({
      operationId: '${camel(o.name)}',
      tags: ['${kebab(o.name)}'],
      responses: {
        200: {
          description: 'Success',
        },
      },
    }),
    ${handler.exportName},
  );\n\n`;
      if (next.includes(anchor)) {
        return insertBefore(next, anchor, route);
      }

      const fallback = '  app.use(\n    helvetiumPages';
      return insertBefore(next, fallback, route);
    },
    o.dryRun ?? false,
  );
  return { method, routePath, handler: handler.exportName, file: paths };
}

export type { HTTPMethod, PathGeneratorOptions };
