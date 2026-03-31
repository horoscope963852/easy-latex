#!/usr/bin/env node
import { runCleanup } from '../src/cleanup.js';

runCleanup()
  .then(() => {
    console.log('easy-latex cleanup finished.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
