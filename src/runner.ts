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

import { parseArguments, booleanOption } from './argv.js';
import { builtInCommands } from './builtins.js';
import { loadProjectCommands } from './config.js';
import { renderHelp, renderList } from './help.js';
import { defaultWriter, paint } from './output.js';
import { findProjectRoot } from './project.js';
import { CommandRegistry } from './registry.js';
import type { RunCLIOptions } from './interfaces/runner.js';

export async function createRegistry(root?: string): Promise<CommandRegistry> {
  const registry = new CommandRegistry();
  for (const command of builtInCommands(registry)) {
    registry.command(command);
  }

  if (root) {
    await loadProjectCommands(root, registry);
  }

  return registry;
}

export async function runCLI(options: RunCLIOptions = {}): Promise<number> {
  const argv = options.argv ?? process.argv.slice(2),
    cwd = options.cwd ?? process.cwd(),
    io = options.io ?? defaultWriter();
  const parsed = parseArguments(argv);
  const hasColor = Object.prototype.hasOwnProperty.call(parsed.options, 'color');
  const noColor =
    (hasColor && parsed.options.color === false) || Boolean(parsed.options['no-color']);
  const color = options.color ?? (!noColor && Boolean(process.stdout.isTTY));
  const json = booleanOption(parsed.options, 'json');

  if (parsed.options.version === true || parsed.options.V === true) {
    io.write('0.1.3');
    return 0;
  }

  const commandName = parsed.positionals[0];
  const projectRoot =
    options.loadProjectExtensions === false ? undefined : await findProjectRoot(cwd);
  const registry = await createRegistry(projectRoot);

  if (!commandName) {
    io.write(renderList(registry.all(), color));
    return 0;
  }

  if (commandName === '--version' || commandName === '-V') {
    io.write('0.1.3');
    return 0;
  }

  const command = registry.get(commandName);
  if (!command) {
    io.error(`${paint('ERROR', 'red', color)} Unknown command: ${commandName}`);
    io.error(`Run helvet list to see available commands.`);
    return 1;
  }

  const args = parsed.positionals.slice(1);
  if (booleanOption(parsed.options, 'help', 'h')) {
    io.write(renderHelp(command, color));
    return 0;
  }

  try {
    const code = await command.run({
      cwd,
      ...(projectRoot ? { projectRoot } : {}),
      args,
      options: parsed.options,
      passthrough: parsed.passthrough,
      io,
      color,
      json,
    });
    return typeof code === 'number' ? code : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) {
      io.error(JSON.stringify({ error: message, command: commandName }));
    } else {
      io.error(`${paint('ERROR', 'red', color)} ${message}`);
    }

    return 1;
  }
}

export type { RunCLIOptions };
