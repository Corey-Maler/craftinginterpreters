import { Token } from "./Token";

export class ParseError extends Error {}

export class RuntimeError extends Error {
  constructor(public readonly token: Token, message: string) {
    super(message);
  }
}

export class Return extends Error {
  constructor(public readonly value: any) {
    super();
  }
}
