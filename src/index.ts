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

export { runCLI, createRegistry, type RunCLIOptions } from './runner.js';
export { CommandRegistry, defineCommand, defineConfig } from './registry.js';
export { parseArguments, stringOption, booleanOption, numberOption } from './argv.js';
export { findProjectRoot, requireProjectRoot, detectPackageManager } from './project.js';
export { inspectRoutes, type RouteInfo } from './routes.js';
export { checkEnvironment } from './env.js';
export { runMigration, type MigrationAction } from './migrations.js';
export { platformExecutable } from './process.js';
export { words, pascal, camel, kebab, snake, ensureSuffix, safeSegment } from './names.js';
export type {
  CommandContext,
  CommandDefinition,
  HelvetiumCLIConfig,
  HelvetiumCLIPlugin,
  CLIOptions,
  ParsedArguments,
  OutputWriter,
} from './types.js';
export type { GeneratorOptions } from './interfaces/generators/base.js';
export * from './generators/index.js';
