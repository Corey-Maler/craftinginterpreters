import { Interpreter } from "./Interpreter";

export interface LoxCallable {
  arity(): number;
  caall(interpreter: Interpreter, argumentes: any[]): any;
  toString(): string;
}
