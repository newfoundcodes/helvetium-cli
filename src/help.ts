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
import { paint } from './output.js';

export function renderList(commands: CommandDefinition[], color = true): string {
  const visible = commands.filter((c) => !c.hidden);
  const groups = new Map<string, CommandDefinition[]>();

  for (const c of visible) {
    const g = c.group ?? 'General';
    const list = groups.get(g) ?? [];

    list.push(c);
    groups.set(g, list);
  }

  const lines = [
    paint('Helvetium CLI', 'bold', color),
    '',
    `Usage: ${paint('helvet <command> [arguments] [options]', 'cyan', color)}`,
    '',
  ];
  for (const [group, list] of groups) {
    lines.push(paint(group, 'yellow', color));

    const width = Math.max(...list.map((c) => c.name.length), 0);
    for (const c of list) {
      lines.push(`  ${paint(c.name.padEnd(width), 'green', color)}  ${c.description}`);
    }

    lines.push('');
  }

  lines.push(`Run ${paint('helvet help <command>', 'cyan', color)} for command-specific help.`);
  return lines.join('\n');
}

export function renderHelp(command: CommandDefinition, color = true): string {
  return [
    paint(command.name, 'bold', color),
    command.description,
    '',
    `Usage: ${paint(command.usage ?? `helvet ${command.name}`, 'cyan', color)}`,
    command.aliases?.length ? `Aliases: ${command.aliases.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
