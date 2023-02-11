import { Token } from "./Token";

export class ParseError extends Error {}

export class RuntimeError extends Error {
  constructor(public readonly token: Token, message: string) {
    super(message);
  }
}
