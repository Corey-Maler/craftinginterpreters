import fs from "node:fs";
import { AstPrinter } from "./AstPrinter";
import { RuntimeError } from "./Errors";
import { Interpreter } from "./Interpreter";
import { Parser } from "./Parser";
import { Scanner } from "./Scanner";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Lox {
  static intepreter = new Interpreter();

  constructor(fileName: string) {
    console.log("Compiling", fileName);
    this.runFile(fileName);

    if (Lox.hadError) {
      process.exit(65);
    }

    if (Lox.hadRuntimeError) {
      process.exit(70);
    }
  }

  runFile(file: string) {
    const content = fs.readFileSync(file);
    this.run(content.toString());
  }

  run(content: string) {
    console.log("input: ", content);
    const scanner = new Scanner(content);
    const tokens = scanner.scanTokens();

    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (Lox.hadError) {
      return;
    }

    // const astPrinter = new AstPrinter();
    // console.log(astPrinter.print(expression!))

    Lox.intepreter.interpret(statements.filter((el) => !!el) as any);
  }

  static hadError = false;
  static hadRuntimeError = false;

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

  static runtimeError(error: RuntimeError) {
    console.log(error.message + "\n[line " + error.token.line + "]");
    Lox.hadRuntimeError = true;
  }

  static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error ${where}: ${message}`);
    Lox.hadError = true;
  }
}
