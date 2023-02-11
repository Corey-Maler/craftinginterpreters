import fs from "node:fs";
import { AstPrinter } from "./AstPrinter";
import { Parser } from "./Parser";
import { Scanner } from "./Scanner";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Lox {
  constructor(fileName: string) {
    console.log("Compiling", fileName);
    this.runFile(fileName);
  }

  runFile(file: string) {
    const content = fs.readFileSync(file);
    this.run(content.toString());
  }

  run(content: string) {
    const scanner = new Scanner(content);
    const tokens = scanner.scanTokens();

    const parser = new Parser(tokens);
    const expression = parser.parse();

    if (Lox.hadError) {
      return;
    }

    const astPrinter = new AstPrinter();
    console.log(astPrinter.print(expression!))

  }

  static hadError = false;

  static error(token: Token, message: string): void;
  static error(line: number, message: string): void;
  static error(line: number | Token, message: string): void {
    if (typeof line === "number") {
      Lox.report(line, "", message);
    } else {
      if (line.type === TokenType.EOF) {
        this.report(line.line, " at the end", message);
      } else {
        this.report(line.line, " at '" + line.lexeme + "'", message);
      }
    }
  }

  static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error ${where}: ${message}`);
    Lox.hadError = true;
  }
}
