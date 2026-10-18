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

import type { CLIOptions } from '../types/types.js';

export interface ParsedArguments {
  positionals: string[];
  options: CLIOptions;
  passthrough: string[];
}

export interface OutputWriter {
  write(message: string): void;
  error(message: string): void;
}

export interface CommandContext {
  cwd: string;
  projectRoot?: string;
  args: string[];
  options: CLIOptions;
  passthrough: string[];
  io: OutputWriter;
  color: boolean;
  json: boolean;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  group?: string;
  hidden?: boolean;
  run(context: CommandContext): Promise<number | void> | number | void;
}

export interface HelvetiumCLIPlugin {
  name?: string;
  register(registry: { command(definition: CommandDefinition): unknown }): void | Promise<void>;
}

export interface HelvetiumCLIConfig {
  plugins?: Array<string | HelvetiumCLIPlugin>;
  commands?: CommandDefinition[];
}
