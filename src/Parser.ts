import { throws } from 'assert';
import * as Expr from '../ast/Expr';
import { ParseError } from './Errors';
import { Lox } from './main';
import { Token } from './Token';
import { TokenType } from './TokenType';

export class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  public parse() {
    try {
      return this.expression();
    } catch (e: unknown) {
      if (e instanceof ParseError) {
        return null;
      }
      throw e;
    }
  }

  private expression() {
    return this.equality();
  }

  private equality() {
    let expr = this.comparision();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparision();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private comparision() {
    let expr = this.term();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private term() {
    let expr = this.factor();
    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private factor() {
    let expr = this.unary();
    while (this.match(TokenType.STAR, TokenType.SLASH)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expr.Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Expr.Unary(operator, right);
    }

    return this.primary();
  }

  private primary(): Expr.Expr {
    if (this.match(TokenType.FALSE)) {
      return new Expr.Literal(false);
    }

    if (this.match(TokenType.TRUE)) {
      return new Expr.Literal(true);
    }

    if (this.match(TokenType.NIL)) {
      return new Expr.Literal(null);
    }

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Expr.Literal(this.previous().literal);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      return new Expr.Grouping(expr);
    }

    throw this.error(this.peek(), "Expected expression");
  }

  private match(...types: TokenType[]) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private advance() {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private check(type: TokenType) {
    if (this.isAtEnd()) {
      return false;
    }

    return this.peek().type === type;
  }

  private isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  private peek() {
    return this.tokens[this.current];
  }

  private previous() {
    return this.tokens[this.current - 1];
  }

  private consume(token: TokenType, msg: string) {
    if (this.check(token)) {
      return this.advance()
    }

    throw this.error(this.peek(), msg);
  }

  private error(token: Token, msg: string) {
    Lox.error(token, msg);
    return new ParseError();
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) {
        return;
      }

      switch (this.peek().type) {
        case TokenType.CLASS:
          case TokenType.FUN:
          case TokenType.VAR:
          case TokenType.FOR:
          case TokenType.IF:
          case TokenType.WHILE:
          case TokenType.PRINT:
          case TokenType.RETURN:
            return;
      }

      this.advance()
    }
  }
}
