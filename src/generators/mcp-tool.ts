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
import { camel } from '../names.js';
import { writeGenerated } from '../files.js';
import type { McpToolGeneratorOptions } from '../types/generators/mcp.js';

export async function generateMcpTool(options: McpToolGeneratorOptions): Promise<{ file: string }> {
  const toolName = camel(options.name.replace(/Tool$/, '')) + 'Tool';
  const file = join(
    options.projectRoot,
    'src',
    'routes',
    'mcp',
    `${camel(options.name.replace(/Tool$/, ''))}.ts`,
  );

  await writeGenerated(
    file,
    `import type { McpTool } from '@newfoundcodes/helvetium-mcp';

export function ${toolName}(): McpTool {
  return {
    description: 'Description for ${toolName}',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async (args) => {
      // Implement tool logic here
      return {
        success: true,
      };
    },
  };
}\n`,
    options.force ?? false,
    options.dryRun ?? false,
  );
  return { file };
}
