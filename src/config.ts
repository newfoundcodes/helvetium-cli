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

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { pathExists } from './project.js';
import type { CommandDefinition, HelvetiumCLIConfig, HelvetiumCLIPlugin } from './types.js';
import type { CommandRegistry } from './registry.js';

async function importFresh(path: string): Promise<unknown> {
  return import(`${pathToFileURL(path).href}?helvet=${Date.now()}`);
}

async function registerPlugin(
  registry: CommandRegistry,
  plugin: string | HelvetiumCLIPlugin,
  root: string,
): Promise<void> {
  let value:
    { register?: (registry: CommandRegistry) => Promise<void>; name?: string } | undefined =
    plugin as unknown as
      { register?: (registry: CommandRegistry) => Promise<void>; name?: string } | undefined;

  if (typeof plugin === 'string') {
    const spec = plugin.startsWith('.')
      ? pathToFileURL(join(root, plugin)).href
      : pathToFileURL(createRequire(join(root, 'package.json')).resolve(plugin)).href;
    const mod = await import(spec);

    value = ((mod as { default?: HelvetiumCLIPlugin }).default ?? (mod as HelvetiumCLIPlugin)) as {
      register?: (registry: CommandRegistry) => Promise<void>;
      name?: string;
    };
  }

  if (typeof value?.register !== 'function') {
    throw new TypeError(
      `Invalid Helvetium CLI plugin: ${typeof plugin === 'string' ? plugin : (value?.name ?? '<anonymous>')}`,
    );
  }

  await value.register(registry);
}

export async function loadProjectCommands(root: string, registry: CommandRegistry): Promise<void> {
  const configPath = join(root, 'helvetium.config.mjs');
  if (await pathExists(configPath)) {
    const mod = await importFresh(configPath);
    const config = ((mod as { default?: HelvetiumCLIConfig }).default ?? mod) as HelvetiumCLIConfig;

    for (const command of config.commands ?? []) {
      registry.command(command);
    }

    for (const plugin of config.plugins ?? []) {
      await registerPlugin(registry, plugin, root);
    }
  }

  const dir = join(root, '.helvetium/commands');
  if (await pathExists(dir)) {
    for (const entry of (await readdir(dir)).sort()) {
      if (!entry.endsWith('.mjs') && !entry.endsWith('.js')) {
        continue;
      }

      const mod = await importFresh(join(dir, entry));
      const command = ((mod as { default?: CommandDefinition; command?: CommandDefinition })
        .default ?? (mod as { command?: CommandDefinition }).command) as CommandDefinition;

      if (command?.name) {
        registry.command(command);
      }
    }
  }
}
