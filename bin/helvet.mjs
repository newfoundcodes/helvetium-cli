#!/usr/bin/env node
import { runCLI } from '../dist/index.js';

const code = await runCLI();
process.exitCode = code;
