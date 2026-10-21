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

import { createProject } from '@newfoundcodes/helvetium-boilerplate';
import type { PackageManager } from '@newfoundcodes/helvetium-boilerplate';
import { checkbox, confirm } from '@inquirer/prompts';
import { join } from 'node:path';
import { booleanOption, numberOption, stringOption } from './argv.js';
import { checkEnvironment } from './env.js';
import {
  generateCommand,
  generateComponent,
  generateHandler,
  generateMiddleware,
  generateMigration,
  generatePage,
  generatePath,
  generateRepository,
  generateTable,
  generateService,
  generateTest,
  generateModel,
  generateWorker,
  generateMcpTool,
} from './generators/index.js';
import { renderHelp, renderList } from './help.js';
import { runMigration } from './migrations.js';
import { paint } from './output.js';
import { detectPackageManager, pathExists, readPackage, requireProjectRoot } from './project.js';
import { runProcess, scriptInvocation } from './process.js';
import type { CommandDefinition } from './types.js';
import type { CommandRegistry } from './registry.js';
import { inspectRoutes } from './routes.js';
import type { CLIOptions } from './types.js';

const force = (o: CLIOptions) => booleanOption(o, 'force', 'f');
const dry = (o: CLIOptions) => booleanOption(o, 'dry-run');

function generated(
  ctx: { io: { write(msg: string): void }; color?: boolean },
  label: string,
  file: string,
): void {
  ctx.io.write(`${paint('CREATE', 'green', ctx.color)} ${label} ${file}`);
}

async function scriptCommand(
  ctx: { cwd: string; passthrough: string[] },
  script: string,
  extra: string[] = [],
) {
  const root = await requireProjectRoot(ctx.cwd);
  const manager = await detectPackageManager(root);
  const pkg = await readPackage(root);
  const scripts = pkg.scripts as Record<string, unknown> | undefined;
  if (typeof scripts?.[script] !== 'string') {
    throw new Error(`The project does not define an npm script named "${script}".`);
  }

  const c = scriptInvocation(manager, script, [...extra, ...ctx.passthrough]);
  return runProcess(c.command, c.args, root);
}

async function buildProject(ctx: { cwd: string; passthrough: string[] }): Promise<number> {
  const root = await requireProjectRoot(ctx.cwd);
  const pkg = await readPackage(root);
  const scripts = pkg.scripts as Record<string, unknown> | undefined;

  if (typeof scripts?.['build:server'] !== 'string') {
    return scriptCommand(ctx, 'build');
  }

  if (typeof scripts.clean === 'string') {
    const cleanCode = await scriptCommand({ cwd: ctx.cwd, passthrough: [] }, 'clean');
    if (cleanCode !== 0) {
      return cleanCode;
    }
  }

  const serverCode = await scriptCommand({ cwd: ctx.cwd, passthrough: [] }, 'build:server');
  if (serverCode !== 0) {
    return serverCode;
  }

  if (typeof scripts['build:web'] !== 'string') {
    return 0;
  }

  return scriptCommand(ctx, 'build:web');
}

async function buildAndServe(ctx: { cwd: string; passthrough: string[] }): Promise<number> {
  const buildCode = await buildProject({ cwd: ctx.cwd, passthrough: [] });
  if (buildCode !== 0) {
    return buildCode;
  }

  return scriptCommand(ctx, 'start');
}

async function initializeGitRepository(directory: string): Promise<boolean> {
  if (await pathExists(join(directory, '.git'))) {
    return false;
  }

  const code = await runProcess('git', ['init'], directory);
  if (code !== 0) {
    throw new Error(`git init exited with code ${code}`);
  }

  return true;
}

export function builtInCommands(registry: CommandRegistry): CommandDefinition[] {
  return [
    {
      name: 'list',
      aliases: ['commands'],
      group: 'General',
      description: 'List available Helvetium commands.',
      usage: 'helvet list',
      run(ctx) {
        ctx.io.write(renderList(registry.all(), ctx.color));
      },
    },
    {
      name: 'help',
      group: 'General',
      description: 'Show help for a command.',
      usage: 'helvet help [command]',
      run(ctx) {
        const name = ctx.args[0];
        if (!name) {
          ctx.io.write(renderList(registry.all(), ctx.color));
          return;
        }

        const c = registry.get(name);
        if (!c) {
          throw new Error(`Unknown command: ${name}`);
        }

        ctx.io.write(renderHelp(c, ctx.color));
      },
    },
    {
      name: 'about',
      aliases: ['--version'],
      group: 'General',
      description: 'Show Helvetium CLI and project information.',
      run: async (ctx) => {
        let project: { name?: string } | undefined;
        try {
          const root = await requireProjectRoot(ctx.cwd);
          project = await readPackage(root);
        } catch {}

        ctx.io.write(
          ctx.json
            ? JSON.stringify(
                { cli: '0.1.0', node: process.version, project: project?.name ?? null },
                null,
                2,
              )
            : `Helvetium CLI 0.1.0\nNode ${process.version}${project ? `\nProject ${project.name}` : ''}`,
        );
      },
    },
    {
      name: 'create',
      group: 'Project',
      description: 'Create a production-ready full-stack Helvetium project.',
      usage:
        'helvet create <directory> [--name NAME] [--package NAME] [--port 3000] [--playwright] [--prettier] [--eslint] [--git|--no-git] [--no-install] [--force]',
      run: async (ctx) => {
        const target = ctx.args[0];
        if (!target) {
          throw new Error('create requires a target directory');
        }

        const install = ctx.options.install !== false;
        const gitFlagProvided = ctx.options.git !== undefined;
        const projectName = stringOption(ctx.options, 'name'),
          packageName = stringOption(ctx.options, 'package'),
          port = numberOption(ctx.options, 'port');
        const anyFlagProvided = ['alps', 'apiary', 'mcp', 'playwright', 'prettier', 'eslint'].some(
          (flag) => ctx.options[flag] !== undefined,
        );

        let useAlps: boolean,
          useApiary: boolean,
          useMcp: boolean,
          usePlaywright: boolean,
          usePrettier: boolean,
          useEslint: boolean;
        if (!anyFlagProvided) {
          const answers = await checkbox({
            message: 'Select the Helvetium modules you want to include:',
            choices: [
              { name: 'Alps (Database, ORM)', value: 'alps', checked: true },
              { name: 'Apiary (Background Jobs)', value: 'apiary', checked: true },
              { name: 'MCP (Model Context Protocol)', value: 'mcp', checked: true },
              { name: 'Playwright (Browser E2E)', value: 'playwright', checked: false },
              { name: 'Prettier (Formatting)', value: 'prettier', checked: false },
              { name: 'ESLint (Linting + Style)', value: 'eslint', checked: false },
            ],
          });

          useAlps = answers.includes('alps');
          useApiary = answers.includes('apiary');
          useMcp = answers.includes('mcp');
          usePlaywright = answers.includes('playwright');
          usePrettier = answers.includes('prettier');
          useEslint = answers.includes('eslint');
        } else {
          useAlps = booleanOption(ctx.options, 'alps', undefined, true);
          useApiary = booleanOption(ctx.options, 'apiary', undefined, true);
          useMcp = booleanOption(ctx.options, 'mcp', undefined, true);
          usePlaywright = booleanOption(ctx.options, 'playwright', undefined, false);
          usePrettier = booleanOption(ctx.options, 'prettier', undefined, false);
          useEslint = booleanOption(ctx.options, 'eslint', undefined, false);
        }

        const result = await createProject({
          targetDirectory: target,
          ...(projectName ? { projectName } : {}),
          ...(packageName ? { packageName } : {}),
          ...(port !== undefined ? { port } : {}),
          force: force(ctx.options),
          install,
          packageManager: (stringOption(ctx.options, 'pm') ?? 'npm') as PackageManager,
          ...(useAlps !== undefined ? { useAlps } : {}),
          ...(useApiary !== undefined ? { useApiary } : {}),
          ...(useMcp !== undefined ? { useMcp } : {}),
          ...(usePlaywright !== undefined ? { usePlaywright } : {}),
          ...(usePrettier !== undefined ? { usePrettier } : {}),
          ...(useEslint !== undefined ? { useEslint } : {}),
        });

        const initializeGit = gitFlagProvided
          ? booleanOption(ctx.options, 'git')
          : await confirm({
              message: 'Would you like to initialize a Git repository for this project?',
              default: true,
            });
        if (initializeGit) {
          const initialized = await initializeGitRepository(result.targetDirectory);
          ctx.io.write(
            `${paint('GIT', 'green', ctx.color)} ${initialized ? 'Initialized repository' : 'Repository already exists'}`,
          );
        }

        ctx.io.write(`${paint('CREATED', 'green', ctx.color)} ${result.targetDirectory}`);
        return 0;
      },
    },
    {
      name: 'new:page',
      aliases: ['make:page'],
      group: 'Generators',
      description: 'Create a Helvetium DOM page and register its browser/SSR route.',
      usage: 'helvet new:page <Name> [--path /path] [--title TITLE] [--no-register] [--force]',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:page requires a name');
        }

        const r = await generatePage({
          name,
          projectRoot: root,
          ...(stringOption(ctx.options, 'path')
            ? { path: stringOption(ctx.options, 'path')! }
            : {}),
          ...(stringOption(ctx.options, 'title')
            ? { title: stringOption(ctx.options, 'title')! }
            : {}),
          register: ctx.options.register !== false,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'page', r.file);
      },
    },
    {
      name: 'new:component',
      aliases: ['make:component'],
      group: 'Generators',
      description: 'Create a reusable Helvetium DOM component.',
      usage: 'helvet new:component <Name> [--force]',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:component requires a name');
        }

        const r = await generateComponent({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'component', r.file);
      },
    },
    {
      name: 'new:handler',
      aliases: ['make:handler'],
      group: 'Generators',
      description: 'Create a Helvetium Boot route handler.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:handler requires a name');
        }

        const r = await generateHandler({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'handler', r.file);
      },
    },
    {
      name: 'new:path',
      aliases: ['make:path', 'new:route'],
      group: 'Generators',
      description: 'Create and register a Helvetium Boot HTTP route and handler.',
      usage: 'helvet new:path <Name> [--method get] [--path /api/name]',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:path requires a name');
        }

        const r = await generatePath({
          name,
          projectRoot: root,
          method: (stringOption(ctx.options, 'method') ?? 'get') as
            'get' | 'post' | 'put' | 'patch' | 'delete',
          ...(stringOption(ctx.options, 'path')
            ? { path: stringOption(ctx.options, 'path')! }
            : {}),
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        ctx.io.write(
          `${paint('REGISTER', 'green', ctx.color)} ${r.method.toUpperCase()} ${r.routePath}`,
        );
      },
    },
    {
      name: 'new:middleware',
      aliases: ['make:middleware'],
      group: 'Generators',
      description: 'Create Helvetium Boot middleware.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:middleware requires a name');
        }

        const r = await generateMiddleware({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'middleware', r.file);
      },
    },
    {
      name: 'new:migration',
      aliases: ['make:migration'],
      group: 'Generators',
      description: 'Create an Alps migration and register it with the project migrator.',
      usage: 'helvet new:migration <name> [--create table] [--table table]',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:migration requires a name');
        }

        const r = await generateMigration({
          name,
          projectRoot: root,
          ...(stringOption(ctx.options, 'create')
            ? { create: stringOption(ctx.options, 'create')! }
            : {}),
          ...(stringOption(ctx.options, 'table')
            ? { table: stringOption(ctx.options, 'table')! }
            : {}),
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'migration', r.file);
      },
    },
    {
      name: 'new:table',
      aliases: ['make:table'],
      group: 'Generators',
      description: 'Create an Alps relational table definition.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:table requires a name');
        }

        const r = await generateTable({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'table', r.file);
      },
    },
    {
      name: 'new:repository',
      aliases: ['make:repository'],
      group: 'Generators',
      description: 'Create an Alps repository class.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:repository requires a name');
        }

        const r = await generateRepository({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'repository', r.file);
      },
    },
    {
      name: 'new:service',
      aliases: ['make:service'],
      group: 'Generators',
      description: 'Create an application service class.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:service requires a name');
        }

        const r = await generateService({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'service', r.file);
      },
    },
    {
      name: 'new:test',
      aliases: ['make:test'],
      group: 'Generators',
      description: 'Create a Node test scaffold.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:test requires a name');
        }

        const r = await generateTest({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'test', r.file);
      },
    },
    {
      name: 'new:model',
      aliases: ['make:model'],
      group: 'Generators',
      description: 'Create an Alps table and repository, optionally with a migration.',
      usage: 'helvet new:model <Name> [--migration]',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:model requires a name');
        }

        const r = await generateModel({
          name,
          projectRoot: root,
          migration: booleanOption(ctx.options, 'migration', 'm'),
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });

        generated(ctx, 'table', r.table.file);
        generated(ctx, 'repository', r.repository.file);

        if (r.migration) {
          generated(ctx, 'migration', r.migration.file);
        }
      },
    },
    {
      name: 'new:command',
      aliases: ['make:command'],
      group: 'Generators',
      description: 'Create a project-local custom Helvetium CLI command.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:command requires a name');
        }

        const r = await generateCommand({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'command', r.file);
      },
    },
    {
      name: 'new:worker',
      aliases: ['make:worker'],
      group: 'Generators',
      description: 'Create a background worker for Helvetium Apiary.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:worker requires a name');
        }

        const r = await generateWorker({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'worker', r.file);
      },
    },
    {
      name: 'new:mcp-tool',
      aliases: ['make:mcp-tool'],
      group: 'Generators',
      description: 'Create a new MCP tool implementation.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd),
          name = ctx.args[0];
        if (!name) {
          throw new Error('new:mcp-tool requires a name');
        }

        const r = await generateMcpTool({
          name,
          projectRoot: root,
          force: force(ctx.options),
          dryRun: dry(ctx.options),
        });
        generated(ctx, 'mcp-tool', r.file);
      },
    },
    {
      name: 'worker',
      aliases: ['workers'],
      group: 'Background',
      description: 'Inspect, trigger, run, or control Helvetium Apiary workers.',
      usage:
        'helvet worker <list|jobs|trigger|run|work|cancel|retry> [name] [payload] [--queue name]',
      run: async (ctx) => {
        const action = ctx.args[0] ?? 'list';
        const allowed = new Set(['list', 'jobs', 'trigger', 'run', 'work', 'cancel', 'retry']);
        if (!allowed.has(action)) {
          throw new Error(`Unknown worker action: ${action}`);
        }

        const root = await requireProjectRoot(ctx.cwd);
        const manager = await detectPackageManager(root);
        const queue = stringOption(ctx.options, 'queue');
        const args = [
          ...ctx.args,
          ...(queue ? [`--queue=${queue}`] : []),
          ...(ctx.json ? ['--json'] : []),
        ];
        const c = scriptInvocation(manager, 'workers', [...args, ...ctx.passthrough]);
        const pkg = await readPackage(root);
        const scripts = pkg.scripts as Record<string, unknown> | undefined;
        if (typeof scripts?.workers !== 'string') {
          throw new Error(
            'This project does not include Apiary worker controls. Regenerate it with Apiary enabled or add the workers script.',
          );
        }

        return runProcess(c.command, c.args, root);
      },
    },
    {
      name: 'migrate',
      group: 'Database',
      description: 'Run Alps migrations. Actions: up, down, status.',
      usage: 'helvet migrate [up|down|status]',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd);
        const action = (ctx.args[0] ?? 'up') as 'up' | 'down' | 'status';

        if (!['up', 'down', 'status'].includes(action)) {
          throw new Error(`Unknown migrate action: ${action}`);
        }

        return runMigration(root, action);
      },
    },
    {
      name: 'migrate:status',
      group: 'Database',
      description: 'Show Alps migration status.',
      run: async (ctx) => runMigration(await requireProjectRoot(ctx.cwd), 'status'),
    },
    {
      name: 'migrate:rollback',
      aliases: ['rollback'],
      group: 'Database',
      description: 'Roll back the latest Alps migration batch step.',
      run: async (ctx) => runMigration(await requireProjectRoot(ctx.cwd), 'down'),
    },
    {
      name: 'route:list',
      aliases: ['routes'],
      group: 'Inspection',
      description: 'List Helvetium Boot routes declared in src/routes/paths.ts.',
      run: async (ctx) => {
        const rows = await inspectRoutes(await requireProjectRoot(ctx.cwd));
        if (ctx.json) {
          ctx.io.write(JSON.stringify(rows, null, 2));
          return;
        }

        const width = Math.max(6, ...rows.map((r) => r.method.length));
        ctx.io.write(
          rows.map((r) => `${r.method.padEnd(width)} ${r.path}`).join('\n') || 'No routes found.',
        );
      },
    },
    {
      name: 'env:check',
      group: 'Inspection',
      description: 'Validate .env against .env.example.',
      run: async (ctx) => {
        const result = await checkEnvironment(await requireProjectRoot(ctx.cwd));
        if (ctx.json) {
          ctx.io.write(JSON.stringify(result, null, 2));
          return result.missing.length ? 1 : 0;
        }

        for (const key of result.present) {
          ctx.io.write(`${paint('OK', 'green', ctx.color)}      ${key}`);
        }

        for (const key of result.missing) {
          ctx.io.error(`${paint('MISSING', 'red', ctx.color)} ${key}`);
        }

        return result.missing.length ? 1 : 0;
      },
    },
    {
      name: 'doctor',
      group: 'Inspection',
      description: 'Diagnose the current Helvetium project and local runtime.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd);
        const pkg = await readPackage(root);

        const checks = [
          ['Node >=22', Number(process.versions.node.split('.')[0]) >= 22],
          ['src/routes/paths.ts', await pathExists(join(root, 'src/routes/paths.ts'))],
          ['src/web.ts', await pathExists(join(root, 'src/web.ts'))],
          ['server.ts', await pathExists(join(root, 'server.ts'))],
          ['migrations/', await pathExists(join(root, 'migrations'))],
          ['background/', await pathExists(join(root, 'background'))],
          [
            'Helvetium Boot',
            Boolean(
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-boot'
              ],
            ),
          ],
          [
            'Helvetium DOM',
            Boolean(
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-dom'
              ],
            ),
          ],
          [
            'Helvetium Alps',
            Boolean(
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-alps'
              ],
            ),
          ],
          [
            'Helvetium Apiary',
            Boolean(
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-apiary'
              ],
            ),
          ],
          [
            'Helvetium MCP',
            Boolean(
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-mcp'
              ],
            ),
          ],
        ] as Array<[string, boolean]>;

        for (const [name, ok] of checks) {
          ctx.io.write(`${paint(ok ? 'PASS' : 'FAIL', ok ? 'green' : 'red', ctx.color)} ${name}`);
        }

        return checks.some(([, ok]) => !ok) ? 1 : 0;
      },
    },
    {
      name: 'project:info',
      group: 'Inspection',
      description: 'Show project package and Helvetium dependency information.',
      run: async (ctx) => {
        const root = await requireProjectRoot(ctx.cwd);
        const pkg = await readPackage(root);

        const info = {
          root,
          name: pkg.name ?? null,
          version: pkg.version ?? null,
          helvetium: {
            boot:
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-boot'
              ] ?? null,
            dom:
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-dom'
              ] ?? null,
            alps:
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-alps'
              ] ?? null,
            apiary:
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-apiary'
              ] ?? null,
            mcp:
              (pkg.dependencies as Record<string, string> | undefined)?.[
                '@newfoundcodes/helvetium-mcp'
              ] ?? null,
          },
        };

        ctx.io.write(
          ctx.json
            ? JSON.stringify(info, null, 2)
            : `Project: ${info.name}
Root: ${root}
Boot: ${info.helvetium.boot}
DOM: ${info.helvetium.dom}
Alps: ${info.helvetium.alps}
Apiary: ${info.helvetium.apiary}
MCP: ${info.helvetium.mcp}`,
        );
      },
    },
    {
      name: 'completion',
      group: 'General',
      description: 'Generate shell completion for bash, zsh, fish, or PowerShell.',
      usage: 'helvet completion <bash|zsh|fish|powershell>',
      run(ctx) {
        const shell = ctx.args[0] ?? 'bash';
        const names = registry
          .all()
          .filter((c) => !c.hidden)
          .map((c) => c.name)
          .join(' ');
        if (shell === 'bash') {
          ctx.io.write(`complete -W "${names}" helvet`);
          return;
        }

        if (shell === 'zsh') {
          ctx.io.write(`#compdef helvet\n_arguments '1:command:(${names})'`);
          return;
        }

        if (shell === 'fish') {
          ctx.io.write(
            names
              .split(' ')
              .map((n) => `complete -c helvet -f -a '${n}'`)
              .join('\n'),
          );
          return;
        }

        if (shell === 'powershell' || shell === 'pwsh') {
          const commands = names
            .split(' ')
            .map((name) => `'${name}'`)
            .join(', ');
          ctx.io.write(`Register-ArgumentCompleter -Native -CommandName helvet -ScriptBlock {
  param($wordToComplete)
  @(${commands}) |
    Where-Object { $_ -like "$wordToComplete*" } |
    ForEach-Object {
      [System.Management.Automation.CompletionResult]::new($_, $_, 'Command', $_)
    }
}`);
          return;
        }

        throw new Error(`Unsupported shell: ${shell}`);
      },
    },
    {
      name: 'dev',
      group: 'Lifecycle',
      description: 'Start the project development server.',
      run: async (ctx) => scriptCommand(ctx, 'dev'),
    },
    {
      name: 'serve',
      aliases: ['start'],
      group: 'Lifecycle',
      description: 'Build and start the production server.',
      run: async (ctx) => buildAndServe(ctx),
    },
    {
      name: 'build',
      group: 'Lifecycle',
      description: 'Build the server and browser bundles.',
      run: async (ctx) => buildProject(ctx),
    },
    {
      name: 'test',
      group: 'Lifecycle',
      description: 'Run the project test suite.',
      run: async (ctx) => scriptCommand(ctx, 'test'),
    },
    {
      name: 'check',
      group: 'Lifecycle',
      description: 'Run the project validation pipeline.',
      run: async (ctx) => scriptCommand(ctx, 'check'),
    },
    {
      name: 'typecheck',
      group: 'Lifecycle',
      description: 'Run the project TypeScript type checker.',
      run: async (ctx) => scriptCommand(ctx, 'typecheck'),
    },
  ];
}
