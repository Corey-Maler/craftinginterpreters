import { Nullable } from "../utils";
import { ParseError, RuntimeError } from "./Errors";
import { Token } from "./Token";

export class Environment {
  public enclosing: Nullable<Environment>;
  private values = new Map<string, any>();

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing ?? null;
  }

  public get(name: Token): any {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme);
    }

    if (this.enclosing) {
      return this.enclosing.get(name);
    }

    throw new RuntimeError(name, "Undefined variable '" + name.lexeme + '".');
  }

  public getAt(distance: number, name: string) {
    return this.ancestor(distance).values.get(name);
  }

  public assignAt(distance: number, name: Token, value: any) {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  private ancestor(distance: number) {
    let env: Environment = this;
    for (let i = 0; i < distance; i++) {
      env = env.enclosing!;
    }

    return env;
  }

  public define(name: string, value: any) {
    this.values.set(name, value);
  }

  public assign(name: Token, value: any): void {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing) {
      return this.enclosing.assign(name, value);
    }

    throw new RuntimeError(name, "Undefined variable '" + name.lexeme + '".');
  }
}
