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

import type { CLIOptions, CLIValue, ParsedArguments } from './types.js';

function add(options: CLIOptions, key: string, value: CLIValue): void {
  const prev = options[key];
  if (prev === undefined) {
    options[key] = value;
    return;
  }

  if (Array.isArray(prev)) {
    prev.push(String(value));
    return;
  }

  options[key] = [String(prev), String(value)];
}

export function parseArguments(input: string[]): ParsedArguments {
  const positionals: string[] = [],
    options: CLIOptions = {},
    passthrough: string[] = [];

  let after = false;
  for (let i = 0; i < input.length; i++) {
    const token = input[i]!;
    if (after) {
      passthrough.push(token);
      continue;
    }

    if (token === '--') {
      after = true;
      continue;
    }

    if (token.startsWith('--')) {
      const raw = token.slice(2);
      const eq = raw.indexOf('=');

      if (eq >= 0) {
        add(options, raw.slice(0, eq), raw.slice(eq + 1));
        continue;
      }

      if (raw.startsWith('no-')) {
        add(options, raw.slice(3), false);
        continue;
      }

      const next = input[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        add(options, raw, next);
        i++;
      } else {
        add(options, raw, true);
      }

      continue;
    }

    if (token.startsWith('-') && token.length > 1) {
      for (const char of token.slice(1)) {
        add(options, char, true);
      }

      continue;
    }

    positionals.push(token);
  }

  return { positionals, options, passthrough };
}

export function stringOption(
  options: CLIOptions,
  name: string,
  alias?: string,
): string | undefined {
  const value = options[name] ?? (alias ? options[alias] : undefined);
  return typeof value === 'string' ? value : Array.isArray(value) ? value.at(-1) : undefined;
}

export function booleanOption(
  options: CLIOptions,
  name: string,
  alias?: string,
  defaultValue = false,
): boolean {
  const value = options[name] ?? (alias ? options[alias] : undefined);
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
}

export function numberOption(options: CLIOptions, name: string): number | undefined {
  const value = stringOption(options, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`--${name} must be a number`);
  }

  return parsed;
}
