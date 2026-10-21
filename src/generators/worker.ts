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
import { camel, kebab } from '../names.js';
import type { WorkerGeneratorOptions } from '../interfaces/generators/worker.js';

export async function generateWorker(o: WorkerGeneratorOptions) {
  const camelName = camel(o.name);
  const fileName = kebab(o.name);
  const file = join(o.projectRoot, 'background/workers', `${fileName}.ts`);

  await writeGenerated(
    file,
    `import { defineJob } from '@newfoundcodes/helvetium-apiary';

export const ${camelName}Worker = defineJob('${o.name}', async (job) => {
  console.log(\`Processing job \${job.id}\`);
});
`,
    o.force ?? false,
    o.dryRun ?? false,
  );

  const registry = join(o.projectRoot, 'background/index.ts');
  if (!o.dryRun) {
    await editText(registry, (source) => {
      const importLine = `import { ${camelName}Worker } from './workers/${fileName}.js';\n`;
      let next = source.includes(importLine)
        ? source
        : insertBefore(source, 'export const workerDefinitions', importLine);
      const anchor = 'export const workerDefinitions = [';
      if (!next.includes(`${camelName}Worker,`)) {
        next = next.replace(anchor, `${anchor}${camelName}Worker, `);
      }

      return next;
    });
  }

  return { file, name: o.name };
}

export type { WorkerGeneratorOptions };
