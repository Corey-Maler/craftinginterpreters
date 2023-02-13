import * as Stmt from "../ast/Stmt";
import { Environment } from "./Environment";
import { Return } from "./Errors";
import { Interpreter } from "./Interpreter";
import { LoxCallable } from "./LoxCallable";
import { LoxInstance } from "./LoxInstance";

export class LoxFunction implements LoxCallable {
  constructor(
    private readonly declaration: Stmt.Fnction,
    private readonly closure: Environment,
    private isInitializer: boolean
  ) {}

  caall(interpreter: Interpreter, argumentes: any[]) {
    const env = new Environment(this.closure);
    for (let i = 0; i < this.declaration.params.length; i++) {
      env.define(this.declaration.params[i].lexeme, argumentes[i]);
    }

    try {
      interpreter.executeBlock(this.declaration.body, env);
    } catch (e: unknown) {
      if (e instanceof Return) {
        if (this.isInitializer) {
          return this.closure.getAt(0, "this");
        }
        return e.value;
      } else {
        throw e;
      }
    }

    if (this.isInitializer) {
      return this.closure.getAt(0, "this");
    }

    return;
  }

  bind(instance: LoxInstance) {
    const environment = new Environment(this.closure);
    environment.define("this", instance);
    return new LoxFunction(this.declaration, environment, this.isInitializer);
  }

  arity(): number {
    return this.declaration.params.length;
  }

  toString(): string {
    return "<fn " + this.declaration.name.lexeme + ">";
  }
}
