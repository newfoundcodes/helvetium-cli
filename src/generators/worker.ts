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
import { camel } from '../names.js';
import type { WorkerGeneratorOptions } from '../interfaces/generators/worker.js';

export async function generateWorker(o: WorkerGeneratorOptions) {
  const camelName = camel(o.name);
  const file = join(o.projectRoot, 'background/workers', `${o.name}.ts`);

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
  return { file, name: o.name };
}

export type { WorkerGeneratorOptions };
