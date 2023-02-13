import { Nullable } from "../utils";
import { Interpreter } from "./Interpreter";
import { LoxCallable } from "./LoxCallable";
import { LoxFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";

export class LoxClass implements LoxCallable {
  constructor(
    public readonly name: string,
    public readonly superklass: Nullable<LoxClass>,
    public readonly methods: Map<string, LoxFunction>
  ) {}

  toString() {
    return "[class " + this.name + "]";
  }

  caall(interpreter: Interpreter, argumentes: any[]) {
    const instance = new LoxInstance(this);

    const initializer = this.findMethod('init');

    if (initializer) {
      initializer.bind(instance).caall(interpreter, argumentes);
    }

    return instance;
  }

  arity(): number {
    const initializer = this.findMethod('init');
    if (!initializer) {
      return 0;
    }

    return initializer.arity();
  }

  public findMethod(name: string): any {
    if (this.methods.has(name)) {
      return this.methods.get(name);
    }

    if (this.superklass) {
      return this.superklass.findMethod(name);
    }

    return null;
  }
}
