import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CommandRegistry,
  booleanOption,
  camel,
  checkEnvironment,
  createRegistry,
  detectPackageManager,
  findProjectRoot,
  generateCommand,
  generateComponent,
  generateHandler,
  generateMiddleware,
  generateMigration,
  generatePage,
  generatePath,
  generateRepository,
  generateTable,
  inspectRoutes,
  migrationTimestamp,
  parseArguments,
  pascal,
  kebab,
  snake,
  runCLI,
  stringOption,
  platformExecutable,
} from '../dist/index.js';
import { createProject, manifest } from '@newfoundcodes/helvetium-boilerplate';

const roots = [];
async function tmp(prefix = 'helvet-cli-') {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function project() {
  const root = await tmp();
  await createProject({
    targetDirectory: root,
    projectName: 'CLI Test',
    packageName: 'cli-test',
    install: false,
  });
  return root;
}

test.after(async () => {
  for (const root of roots) {
    await rm(root, { recursive: true, force: true });
  }
});

function memoryIO() {
  const out = [],
    err = [];
  return { out, err, io: { write: (m) => out.push(m), error: (m) => err.push(m) } };
}

test('argv 01 parses positional command', () =>
  assert.deepEqual(parseArguments(['list']).positionals, ['list']));
test('argv 02 parses long string option', () =>
  assert.equal(stringOption(parseArguments(['x', '--path', '/a']).options, 'path'), '/a'));
test('argv 03 parses equals option', () =>
  assert.equal(stringOption(parseArguments(['x', '--path=/a']).options, 'path'), '/a'));
test('argv 04 parses no-option as false', () =>
  assert.equal(parseArguments(['x', '--no-install']).options.install, false));
test('argv 05 parses short boolean aliases', () =>
  assert.equal(parseArguments(['x', '-f']).options.f, true));
test('argv 06 preserves passthrough after separator', () =>
  assert.deepEqual(parseArguments(['test', '--', '--watch']).passthrough, ['--watch']));
test('argv 07 accumulates repeated options', () =>
  assert.deepEqual(parseArguments(['x', '--tag', 'a', '--tag', 'b']).options.tag, ['a', 'b']));
test('argv 08 booleanOption parses false text', () =>
  assert.equal(booleanOption({ flag: 'false' }, 'flag'), false));
test('argv 09 missing string option is undefined', () =>
  assert.equal(stringOption({}, 'x'), undefined));
test('argv 10 does not treat negative-free positionals as options', () =>
  assert.deepEqual(parseArguments(['new:page', 'AboutPage']).positionals, [
    'new:page',
    'AboutPage',
  ]));

test('names 01 pascal case', () => assert.equal(pascal('about_page'), 'AboutPage'));
test('names 02 camel case', () => assert.equal(camel('About Page'), 'aboutPage'));
test('names 03 kebab case', () => assert.equal(kebab('AboutPage'), 'about-page'));
test('names 04 snake case', () => assert.equal(snake('AboutPage'), 'about_page'));
test('names 05 kebab collapses punctuation', () =>
  assert.equal(kebab('hello---world'), 'hello-world'));
test('names 06 pascal handles acronyms predictably', () =>
  assert.equal(pascal('API user'), 'ApiUser'));

test('registry 01 registers command', () => {
  const r = new CommandRegistry();
  r.command({ name: 'x', description: 'x', run() {} });

  assert.ok(r.get('x'));
});

test('registry 02 registers aliases', () => {
  const r = new CommandRegistry();
  r.command({ name: 'x', aliases: ['y'], description: 'x', run() {} });

  assert.equal(r.get('x'), r.get('y'));
});

test('registry 03 rejects duplicates', () => {
  const r = new CommandRegistry();
  r.command({ name: 'x', description: 'x', run() {} });

  assert.throws(() => r.command({ name: 'x', description: 'x', run() {} }));
});

test('registry 04 rejects invalid command names', () => {
  const r = new CommandRegistry();
  assert.throws(() => r.command({ name: 'bad name', description: 'x', run() {} }));
});

test('registry 05 builtins include create', async () =>
  assert.ok((await createRegistry()).get('create')));
test('registry 06 builtins include migration aliases', async () =>
  assert.ok((await createRegistry()).get('migrate:rollback')));

test('project 01 generated boilerplate is detected', async () => {
  const root = await project();
  assert.equal(await findProjectRoot(root), root);
});

test('project 02 parent traversal finds root', async () => {
  const root = await project(),
    deep = join(root, 'src/app/components');
  assert.equal(await findProjectRoot(deep), root);
});

test('project 03 outside project returns undefined', async () => {
  const root = await tmp();
  assert.equal(await findProjectRoot(root), undefined);
});

test('project 04 npm is default package manager', async () => {
  const root = await project();
  assert.equal(await detectPackageManager(root), 'npm');
});

test('project 05 pnpm lock selects pnpm', async () => {
  const root = await project();
  await writeFile(join(root, 'pnpm-lock.yaml'), '');

  assert.equal(await detectPackageManager(root), 'pnpm');
});

test('process 01 uses native executables on each platform', () => {
  assert.equal(platformExecutable('npm', 'linux'), 'npm');
  assert.equal(platformExecutable('npm', 'darwin'), 'npm');
  assert.equal(platformExecutable('npm', 'win32'), 'npm.cmd');
  assert.equal(platformExecutable('pnpm', 'win32'), 'pnpm.cmd');
  assert.equal(platformExecutable('yarn', 'win32'), 'yarn.cmd');
  assert.equal(platformExecutable('bun', 'win32'), 'bun.exe');
});

test('generator 01 creates page', async () => {
  const root = await project();
  const r = await generatePage({ name: 'Contact', projectRoot: root });

  const source = await readFile(r.file, 'utf8');
  assert.match(source, /ContactPage/);
  assert.doesNotMatch(source, /import .*\b(?:h|Fragment)\b/);
});

test('generator 02 registers page route', async () => {
  const root = await project();
  await generatePage({ name: 'Contact', projectRoot: root, path: '/contact-us' });

  assert.match(await readFile(join(root, 'src/app/routes.ts'), 'utf8'), /contact-us/);
});

test('generator 03 page refuses overwrite', async () => {
  const root = await project();
  await generatePage({ name: 'Contact', projectRoot: root, register: false });

  await assert.rejects(() => generatePage({ name: 'Contact', projectRoot: root, register: false }));
});

test('generator 04 creates component', async () => {
  const root = await project();
  const r = await generateComponent({ name: 'Alert', projectRoot: root });

  const source = await readFile(r.file, 'utf8');
  assert.match(source, /AlertComponent/);
  assert.doesNotMatch(source, /import .*\b(?:h|Fragment)\b/);
});

test('generator 05 creates handler', async () => {
  const root = await project();
  const r = await generateHandler({ name: 'orders', projectRoot: root });

  assert.match(await readFile(r.file, 'utf8'), /ordersHandler/);
});

test('generator 06 creates and registers path', async () => {
  const root = await project();
  await generatePath({ name: 'orders', projectRoot: root, method: 'post', path: '/api/orders' });

  const routes = await inspectRoutes(root);
  assert.ok(routes.some((r) => r.method === 'POST' && r.path === '/api/orders'));
});

test('generator 07 creates middleware', async () => {
  const root = await project();
  const r = await generateMiddleware({ name: 'auth', projectRoot: root });

  assert.match(await readFile(r.file, 'utf8'), /authMiddleware/);
});

test('generator 08 creates table', async () => {
  const root = await project();
  const r = await generateTable({ name: 'posts', projectRoot: root });

  assert.match(await readFile(r.file, 'utf8'), /defineTable/);
});

test('generator 09 creates repository', async () => {
  const root = await project();
  const r = await generateRepository({ name: 'Post', projectRoot: root });

  assert.match(await readFile(r.file, 'utf8'), /PostRepository/);
});

test('generator 10 migration timestamp format', () =>
  assert.equal(migrationTimestamp(new Date(2026, 8, 5, 15, 33, 24)), '09052026_153324'));

test('generator 11 creates migration and updates registry', async () => {
  const root = await project();
  const r = await generateMigration({
    name: 'create_posts',
    projectRoot: root,
    create: 'posts',
    now: new Date(2026, 8, 5, 15, 33, 24),
  });

  assert.match(await readFile(r.file, 'utf8'), /createTable/);
  assert.match(
    await readFile(join(root, 'scripts/migrations.ts'), 'utf8'),
    /09052026_153324_create_posts/,
  );
});

test('generator 12 generic migration has up and down', async () => {
  const root = await project();
  const r = await generateMigration({
    name: 'custom_change',
    projectRoot: root,
    now: new Date(2026, 8, 5, 15, 33, 25),
  });

  const s = await readFile(r.file, 'utf8');
  assert.match(s, /up\(/);
  assert.match(s, /down\(/);
});

test('generator 13 creates custom command', async () => {
  const root = await project();
  const r = await generateCommand({ name: 'hello-world', projectRoot: root });

  assert.match(await readFile(r.file, 'utf8'), /hello-world/);
});

test('generator 14 dry run does not create page file', async () => {
  const root = await project();
  const r = await generatePage({ name: 'Dry', projectRoot: root, register: false, dryRun: true });

  await assert.rejects(() => readFile(r.file));
});

test('routes 01 inspects starter routes', async () => {
  const root = await project();
  const routes = await inspectRoutes(root);

  assert.ok(routes.some((r) => r.path === '/api/health'));
});

test('routes 02 includes POST route', async () => {
  const root = await project();
  const routes = await inspectRoutes(root);

  assert.ok(routes.some((r) => r.method === 'POST' && r.path === '/api/users'));
});

test('env 01 finds required keys', async () => {
  const root = await project();
  const r = await checkEnvironment(root);

  assert.ok(r.required.includes('PORT'));
});

test('env 02 reports missing without env file', async () => {
  const root = await project();
  const r = await checkEnvironment(root);

  assert.ok(r.missing.length > 0);
});

test('env 03 reads .env values', async () => {
  const root = await project();
  const example = await readFile(join(root, '.env.example'), 'utf8');
  await writeFile(join(root, '.env'), example);

  const r = await checkEnvironment(root);
  assert.equal(r.missing.length, 0);
});

test('cli 01 list succeeds', async () => {
  const m = memoryIO();
  assert.equal(
    await runCLI({
      argv: ['list'],
      cwd: await tmp(),
      io: m.io,
      color: false,
      loadProjectExtensions: false,
    }),
    0,
  );
  assert.ok(m.out.join('\n').includes('new:page'));
});

test('cli 02 unknown command fails', async () => {
  const m = memoryIO();
  assert.equal(
    await runCLI({
      argv: ['does:not:exist'],
      cwd: await tmp(),
      io: m.io,
      color: false,
      loadProjectExtensions: false,
    }),
    1,
  );
});

test('cli 03 help command succeeds', async () => {
  const m = memoryIO();

  await runCLI({
    argv: ['help', 'new:page'],
    cwd: await tmp(),
    io: m.io,
    color: false,
    loadProjectExtensions: false,
  });
  assert.ok(m.out.join('\n').includes('helvet new:page'));
});

test('cli 04 create generates project without install', async () => {
  const parent = await tmp(),
    target = join(parent, 'app'),
    m = memoryIO();
  const code = await runCLI({
    argv: ['create', target, '--no-install', '--alps', '--mcp', '--no-git'],
    cwd: parent,
    io: m.io,
    color: false,
    loadProjectExtensions: false,
  });

  assert.equal(code, 0);
  assert.ok(await readFile(join(target, 'server.ts'), 'utf8'));

  const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));

  assert.equal(
    pkg.dependencies['@newfoundcodes/helvetium-apiary'],
    `>=${manifest.framework.apiary}`,
  );
  assert.equal(pkg.dependencies['@newfoundcodes/helvetium-catapult'], undefined);
  assert.equal(pkg.dependencies['@newfoundcodes/helvetium-flakturm'], undefined);

  assert.match(await readFile(join(target, 'background/index.ts'), 'utf8'), /createApiary/);
  assert.equal(await readFile(join(target, 'src/cdn.ts')).catch(() => null), null);
});

test('cli 04a create can opt into Playwright browser tests', async () => {
  const parent = await tmp(),
    target = join(parent, 'playwright-app'),
    m = memoryIO();
  const code = await runCLI({
    argv: [
      'create',
      target,
      '--no-install',
      '--no-alps',
      '--no-apiary',
      '--no-mcp',
      '--playwright',
      '--no-git',
    ],
    cwd: parent,
    io: m.io,
    color: false,
    loadProjectExtensions: false,
  });

  assert.equal(code, 0);
  const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  assert.equal(pkg.devDependencies['@playwright/test'], '^1.55.0');
  assert.equal(pkg.scripts['test:e2e'], 'npm run build && playwright test');
  assert.ok(await readFile(join(target, 'playwright.config.ts'), 'utf8'));
  assert.ok(await readFile(join(target, 'e2e/home.spec.ts'), 'utf8'));
});

test('cli 04b create can opt into Prettier and ESLint style checks', async () => {
  const parent = await tmp(),
    target = join(parent, 'quality-app'),
    m = memoryIO();
  const code = await runCLI({
    argv: ['create', target, '--no-install', '--prettier', '--eslint', '--no-git'],
    cwd: parent,
    io: m.io,
    color: false,
    loadProjectExtensions: false,
  });

  assert.equal(code, 0);
  const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  assert.equal(pkg.devDependencies.prettier, '^3.9.6');
  assert.equal(pkg.devDependencies['@stylistic/eslint-plugin'], '^5.10.0');
  assert.ok(await readFile(join(target, 'prettier.config.mjs'), 'utf8'));
  assert.ok(await readFile(join(target, 'eslint.config.mjs'), 'utf8'));
});

test('cli 04c create can initialize Git when requested', async () => {
  const parent = await tmp(),
    target = join(parent, 'git-app'),
    m = memoryIO();
  const code = await runCLI({
    argv: ['create', target, '--no-install', '--no-alps', '--no-apiary', '--no-mcp', '--git'],
    cwd: parent,
    io: m.io,
    color: false,
    loadProjectExtensions: false,
  });

  assert.equal(code, 0);
  assert.match(await readFile(join(target, '.git', 'HEAD'), 'utf8'), /^ref:/);
  assert.ok(m.out.some((line) => line.includes('Initialized repository')));
});

test('cli 04d create can skip Git initialization', async () => {
  const parent = await tmp(),
    target = join(parent, 'no-git-app'),
    m = memoryIO();
  const code = await runCLI({
    argv: ['create', target, '--no-install', '--no-alps', '--no-apiary', '--no-mcp', '--no-git'],
    cwd: parent,
    io: m.io,
    color: false,
    loadProjectExtensions: false,
  });

  assert.equal(code, 0);
  await assert.rejects(() => readFile(join(target, '.git', 'HEAD')));
  assert.ok(m.out.every((line) => !line.includes('Initialized repository')));
});

test('cli 05 new page works from nested directory', async () => {
  const root = await project(),
    m = memoryIO();
  const code = await runCLI({
    argv: ['new:page', 'LegalPage', '--path', '/legal'],
    cwd: join(root, 'src/app'),
    io: m.io,
    color: false,
  });

  assert.equal(code, 0);
  assert.match(await readFile(join(root, 'src/app/routes.ts'), 'utf8'), /\/legal/);
});

test('cli 06 route list supports json', async () => {
  const root = await project(),
    m = memoryIO();
  const code = await runCLI({ argv: ['route:list', '--json'], cwd: root, io: m.io, color: false });

  assert.equal(code, 0);
  assert.doesNotThrow(() => JSON.parse(m.out[0]));
});

test('cli 07 doctor passes generated project structure', async () => {
  const root = await project(),
    m = memoryIO();
  const code = await runCLI({ argv: ['doctor'], cwd: root, io: m.io, color: false });

  assert.equal(code, 0);
});

test('cli 08 project-local custom command is loaded', async () => {
  const root = await project();
  await mkdir(join(root, '.helvetium/commands'), { recursive: true });
  await writeFile(
    join(root, '.helvetium/commands/hello.mjs'),
    `export default {name:'hello',description:'x',run(c){c.io.write('hello-project')}}`,
  );

  const m = memoryIO();
  assert.equal(await runCLI({ argv: ['hello'], cwd: root, io: m.io, color: false }), 0);
  assert.equal(m.out[0], 'hello-project');
});

test('cli 09 env check returns failure when values missing', async () => {
  const root = await project(),
    m = memoryIO();
  assert.equal(await runCLI({ argv: ['env:check'], cwd: root, io: m.io, color: false }), 1);
});

test('cli 10 generators honor force overwrite', async () => {
  const root = await project(),
    m = memoryIO();
  await runCLI({ argv: ['new:component', 'Card'], cwd: root, io: m.io, color: false });

  assert.equal(
    await runCLI({ argv: ['new:component', 'Card', '--force'], cwd: root, io: m.io, color: false }),
    0,
  );
});

test('generator 15 creates service', async () => {
  const root = await project();
  const { generateService } = await import('../dist/index.js');
  const r = await generateService({ name: 'Billing', projectRoot: root });

  assert.match(await readFile(r.file, 'utf8'), /BillingService/);
});

test('generator 16 creates test scaffold', async () => {
  const root = await project();
  const { generateTest } = await import('../dist/index.js');
  const r = await generateTest({ name: 'billing-flow', projectRoot: root });

  assert.match(await readFile(r.file, 'utf8'), /node:test/);
});

test('generator 17 creates model table and repository', async () => {
  const root = await project();
  const { generateModel } = await import('../dist/index.js');
  const r = await generateModel({ name: 'Post', projectRoot: root });

  assert.ok(r.table.file.endsWith('posts.ts'));
  assert.ok(r.repository.file.endsWith('PostRepository.ts'));
});

test('cli 11 global version flag works', async () => {
  const m = memoryIO();
  assert.equal(
    await runCLI({
      argv: ['--version'],
      cwd: await tmp(),
      io: m.io,
      color: false,
      loadProjectExtensions: false,
    }),
    0,
  );
  assert.equal(m.out[0], '0.1.3');
});

test('cli 12 completion outputs bash commands', async () => {
  const m = memoryIO();
  assert.equal(
    await runCLI({
      argv: ['completion', 'bash'],
      cwd: await tmp(),
      io: m.io,
      color: false,
      loadProjectExtensions: false,
    }),
    0,
  );
  assert.match(m.out[0], /new:page/);
});

test('cli 13 completion outputs PowerShell commands', async () => {
  const m = memoryIO();
  assert.equal(
    await runCLI({
      argv: ['completion', 'powershell'],
      cwd: await tmp(),
      io: m.io,
      color: false,
      loadProjectExtensions: false,
    }),
    0,
  );
  assert.match(m.out[0], /Register-ArgumentCompleter/);
  assert.match(m.out[0], /new:page/);
});

test('generator 18 preserves command namespaces', async () => {
  const root = await project();
  const r = await generateCommand({ name: 'reports:daily', projectRoot: root });

  assert.equal(r.name, 'reports:daily');
  assert.match(await readFile(r.file, 'utf8'), /reports:daily/);
});

test('generator 19 creates an Apiary worker', async () => {
  const d = await project();
  const m = memoryIO();
  const w = join(d, 'background/workers', 'sync.ts');

  await runCLI({ argv: ['new:worker', 'sync'], cwd: d, io: m.io, color: false });
  assert.match(await readFile(w, 'utf8'), /syncWorker/);
  assert.match(await readFile(w, 'utf8'), /helvetium-apiary/);
  assert.match(
    await readFile(join(d, 'background/index.ts'), 'utf8'),
    /workerDefinitions = \[syncWorker,/,
  );
});

test('cli 14 exposes Apiary worker controls', async () => {
  const registry = await createRegistry();
  const command = registry.get('worker');

  assert.ok(command);
  assert.equal(registry.get('workers'), command);
});
