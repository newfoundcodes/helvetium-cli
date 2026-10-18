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

import type { CommandDefinition } from './types.js';

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  command(definition: CommandDefinition): this {
    if (!/^[a-z0-9][a-z0-9:_-]*$/i.test(definition.name)) {
      throw new TypeError(`Invalid command name: ${definition.name}`);
    }

    const names = [definition.name, ...(definition.aliases ?? [])];
    for (const name of names) {
      if (this.commands.has(name)) {
        throw new Error(`Duplicate command or alias: ${name}`);
      }
    }

    for (const name of names) {
      this.commands.set(name, definition);
    }

    return this;
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  all(): CommandDefinition[] {
    return [...new Set(this.commands.values())].sort(
      (a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.name.localeCompare(b.name),
    );
  }
}

export function defineCommand(definition: CommandDefinition): CommandDefinition {
  return definition;
}

export function defineConfig<T extends { plugins?: unknown[]; commands?: CommandDefinition[] }>(
  config: T,
): T {
  return config;
}
