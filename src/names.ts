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

export function words(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function pascal(input: string): string {
  return words(input)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
    .join('');
}

export function camel(input: string): string {
  const p = pascal(input);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function kebab(input: string): string {
  return words(input)
    .map((x) => x.toLowerCase())
    .join('-');
}

export function snake(input: string): string {
  return words(input)
    .map((x) => x.toLowerCase())
    .join('_');
}

export function ensureSuffix(value: string, suffix: string): string {
  const p = pascal(value);
  return p.toLowerCase().endsWith(suffix.toLowerCase()) ? p : `${p}${suffix}`;
}

export function safeSegment(value: string): string {
  const s = kebab(value);
  if (!s || s === '.' || s === '..' || s.includes('/') || s.includes('\\')) {
    throw new TypeError(`Invalid name: ${value}`);
  }

  return s;
}
