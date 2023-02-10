console.log('hello world')

import { Lox } from './src/main';
import fs from 'fs';
import path from 'node:path';

// print process.argv
process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});

const fileName = process.argv[2];

if (process.argv[3]) {
  console.log('Usage: ts-node index.ts <filename>')
  process.exit(1);
}

const main = new Lox(path.resolve(__dirname, fileName));
