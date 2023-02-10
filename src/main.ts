import fs from 'node:fs';
import { Scanner } from './Scanner';

export class Lox {
  constructor(fileName: string) {
    console.log('main created with filename', fileName);
    this.runFile(fileName);
  }

  runFile(file: string) {
    const content = fs.readFileSync(file);
    this.run(content.toString());
  }

  run(content: string) {
    const scanner = new Scanner(content);
    const tokens = scanner.scanTokens()
    tokens.forEach(token => {
      console.log(token.toString())
    })
  }

  static hadError = false;

  static error(line: number, message: string) {
    Lox.report(line, "", message)
  }

  static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error ${where}: ${message}`);
    Lox.hadError = true;
  }
}
