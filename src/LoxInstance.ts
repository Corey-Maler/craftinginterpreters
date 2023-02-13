import { Environment } from "./Environment";
import { RuntimeError } from "./Errors";
import { LoxClass } from "./LoxClass";
import { Token } from "./Token";

export class LoxInstance {
  private fields = new Map<string, any>();
  constructor(private klass: LoxClass) {}

  toString() {
    return "[class +" + this.klass.name + " instance]";
  }

  get(name: Token) {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.klass.findMethod(name.lexeme);
    if (method) {
      return method.bind(this);
    }

    throw new RuntimeError(name, "Undefined property " + name.lexeme);
  }

  set(name: Token, value: any) {
    this.fields.set(name.lexeme, value);
  }
}
