import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();

await Promise.all(
  ['dist', 'coverage', 'site'].map((entry) =>
    rm(join(root, entry), { recursive: true, force: true }),
  ),
);
