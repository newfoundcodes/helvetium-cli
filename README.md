<div align="center">
  <img src="https://github.com/newfoundcodes/newfoundcodes-logo/blob/main/newfoundcodes-helvetium.png?raw=true" width="128" />
  <h1>Helvetium CLI</h1>
  <p>
    <a href="https://github.com/newfoundcodes/helvetium-cli/actions"><img src="https://github.com/newfoundcodes/helvetium-cli/actions/workflows/ci.yml/badge.svg" alt="Build Status"></a>
  </p>
</div>

Command-line interface for the Helvetium web framework. It provides the `helvet` executable and coordinates Helvetium Boilerplate, Boot, DOM, and Alps workflows from one command surface.

## Install globally

```bash
npm install -g @newfoundcodes/helvetium-cli
```

Verify:

```bash
helvet --version
helvet list
```

## Create a project

```bash
helvet create my-app
cd my-app
helvet migrate up
helvet dev
```

Project generation is delegated to `@newfoundcodes/helvetium-boilerplate`. The CLI bundles the compatible Boilerplate release in its npm publication artifact so `helvet create` has a deterministic template implementation.

Generate without installing project dependencies:

```bash
helvet create my-app --no-install
```

Other options:

```bash
helvet create my-app \
  --name "My Application" \
  --package @acme/my-app \
  --port 4000 \
  --pm npm
```

## Generators

### Page

```bash
helvet new:page AboutPage
helvet new:page LegalPage --path /legal --title "Legal"
```

This creates the page component and registers it in `src/app/routes.ts` for both Boot SSR and DOM browser routing.

### Component

```bash
helvet new:component Alert
```

Creates `src/app/components/AlertComponent.tsx`.

### Back-end path

```bash
helvet new:path orders --method post --path /api/orders
```

This creates a handler in `src/routes/handlers/orders.ts` and registers the Boot route with basic OpenAPI metadata in `src/routes/paths.ts`.

### Handler only

```bash
helvet new:handler orders
```

### Middleware

```bash
helvet new:middleware authenticated
```

Creates middleware under `src/middlewares/`. Middleware remains explicitly imported/registered by the application.

### Migration

```bash
helvet new:migration create_posts --create posts
helvet new:migration add_slug_to_posts --table posts
helvet new:migration custom_change
```

Migration filenames use the local machine time:

```text
09052026_153324_create_posts.ts
```

The generator also updates `scripts/migrations.ts`, so the migration is immediately visible to the application's Alps migrator.

### Alps table and repository

```bash
helvet new:table posts
helvet new:repository Post
```

Or generate the common model set:

```bash
helvet new:model Post
helvet new:model Post --migration
```

### Services and tests

```bash
helvet new:service Billing
helvet new:test billing-flow
```

### Project-local command

```bash
helvet new:command reports:daily
```

This creates a command module below `.helvetium/commands/`.

## Migrations

```bash
helvet migrate up
helvet migrate down
helvet migrate status
```

Aliases:

```bash
helvet migrate:status
helvet migrate:rollback
helvet rollback
```

The CLI runs the generated project's migration scripts. Database configuration and durable migration-state storage remain application-owned.

## Route inspection

```bash
helvet route:list
```

Example:

```text
GET    /api/health
GET    /api/users
GET    /api/users/:id
POST   /api/users
GET    /openapi.json
```

Machine-readable output:

```bash
helvet route:list --json
```

## Environment and diagnostics

```bash
helvet env:check
helvet doctor
helvet project:info
```

`env:check` compares `.env.example` with the process environment and `.env`. `doctor` checks the Node runtime, expected project layout, and core Helvetium dependencies.

## Application lifecycle

```bash
helvet dev
helvet build
helvet serve
helvet test
helvet typecheck
helvet check
```

These commands delegate to the current project's package-manager scripts. Arguments after `--` are forwarded when supported:

```bash
helvet test -- --watch
```

## Command discovery

```bash
helvet list
helvet help new:page
```

The command interface follows the same useful CLI conventions as Artisan: a discoverable command list, per-command help, generators, and migration lifecycle operations.

## Custom commands

Create `.helvetium/commands/hello.mjs`:

```js
export default {
  name: 'hello',
  description: 'Say hello',
  async run(context) {
    context.io.write('Hello from this project');
    return 0;
  },
};
```

Then:

```bash
helvet hello
```

## `helvetium.config.mjs`

Projects may register commands or plugins:

```js
export default {
  commands: [
    {
      name: 'app:info',
      description: 'Show application information',
      run(context) {
        context.io.write(`Project: ${context.projectRoot}`);
      },
    },
  ],
  plugins: ['./tools/cli-plugin.mjs'],
};
```

A plugin exports a `register(registry)` function:

```js
export default {
  name: 'my-plugin',
  register(registry) {
    registry.command({
      name: 'plugin:hello',
      description: 'Plugin command',
      run(context) {
        context.io.write('hello');
      },
    });
  },
};
```

Project-local CLI modules are executable JavaScript. Only run Helvetium CLI inside repositories you trust.

## Programmatic API

```ts
import { createRegistry, defineCommand, runCLI } from '@newfoundcodes/helvetium-cli';
```

Generators are also exported:

```ts
import {
  generateMigration,
  generatePage,
  generatePath,
} from '@newfoundcodes/helvetium-cli/generators';
```

This is intended for the future wider Helvetium CLI/plugin ecosystem as well as test harnesses and automation.

## Shell completion

```bash
helvet completion bash
helvet completion zsh
helvet completion fish
```

For Bash, for example:

```bash
source <(helvet completion bash)
```

## Documentation

```bash
npm run docs:setup
npm run docs:build
npm run docs:serve
```

The repository uses Material for MkDocs through a project-local Python virtual environment.

## Safety model

Generators refuse existing target files unless `--force` is explicitly supplied. `--dry-run` is available on generator commands to calculate changes without writing files.

`helvetium.config.mjs`, project-local commands, plugins, migrations, and package scripts are executable project code. Do not use the CLI in an untrusted repository.

## Requirements

- Node.js 22 or newer.
- A supported package manager for project lifecycle operations.
- Python 3 only when building/serving the MkDocs documentation locally.

## License

This project is licensed under the [AGPL-3.0-only](https://spdx.org/licenses/AGPL-3.0-only.html) License.
