import { throws } from "assert";
import * as Expr from "../ast/Expr";
import * as Stmt from "../ast/Stmt";
import { Nullable } from "../utils";
import { ParseError } from "./Errors";
import { Lox } from "./main";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  public parse() {
    const statements: (Stmt.Stmt | undefined)[] = [];

    while (!this.isAtEnd()) {
      //statements.push(this.statement());
      statements.push(this.declaration());
    }

    return statements;
    /*
    try {
      return this.expression();
    } catch (e: unknown) {
      if (e instanceof ParseError) {
        return null;
      }
      throw e;
    }*/
  }

  private declaration() {
    try {
      if (this.match(TokenType.CLASS)) {
        return this.classDeclaration();
      }
      if (this.match(TokenType.FUN)) {
        return this.fnction("function");
      }

      if (this.match(TokenType.VAR)) {
        return this.varDeclaration();
      }

      return this.statement();
    } catch (e: unknown) {
      if (e instanceof ParseError) {
        this.synchronize();
        return;
      }
    }
  }

  private classDeclaration(): Stmt.Stmt {
    const name = this.consume(TokenType.IDENTIFIER, "Expect class name.");

    let superclass = null;
    if (this.match(TokenType.LESS)) {
      this.consume(TokenType.IDENTIFIER, "expected superclass name");
      superclass = new Expr.Variable(this.previous());
    }

    this.consume(TokenType.LEFT_BRACE, 'Expect "{" before class body.');

    const methods = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.fnction("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, 'Expect "}" after class body.');

    return new Stmt.Class(name, superclass, methods);
  }

  private fnction(kind: string): Stmt.Fnction {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "expect " + kind + " name."
    );

    this.consume(TokenType.LEFT_PAREN, "Expect ");

    const parameters: Token[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "can't have more than 255 parameters");
        }

        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expected parameter name")
        );
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "expect ) after function parameters");

    this.consume(TokenType.LEFT_BRACE, "expect { before " + kind + " body.");
    const body = this.block();

    return new Stmt.Fnction(name, parameters, body);
  }

  private varDeclaration(): Stmt.Stmt {
    const name = this.consume(TokenType.IDENTIFIER, "Expect variable name");

    let initializer = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ; after declaration");
    return new Stmt.Var(name, initializer);
  }

  private statement() {
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }

    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }

    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }

    if (this.match(TokenType.PRINT)) {
      return this.printStatement();
    }

    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      return new Stmt.Block(this.block());
    }

    return this.expressionStatement();
  }

  private returnStatement(): Stmt.Stmt {
    const keyword = this.previous();
    let value = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new Stmt.Return(keyword, value);
  }

  private whileStatement(): Stmt.Stmt {
    this.consume(TokenType.LEFT_PAREN, "expect ( after while");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "expect ) after while");
    const body = this.statement();

    return new Stmt.While(condition, body);
  }

  private forStatement(): any {
    this.consume(TokenType.LEFT_PAREN, 'expected "(" after for');
    let initializer: Nullable<Stmt.Stmt> = null;

    if (this.match(TokenType.SEMICOLON)) {
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "expect ; after loop statement");

    let increment = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "expect ')' after for clauses");

    let body = this.statement();

    if (increment) {
      body = new Stmt.Block([body, new Stmt.Expression(increment)]);
    }

    if (condition === null) {
      condition = new Expr.Literal(true);
    }

    body = new Stmt.While(condition, body);

    if (initializer) {
      body = new Stmt.Block([initializer, body]);
    }

    return body;
  }

  private ifStatement(): Stmt.Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after if");
    const condition = this.expression();

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");

    const thenBranch = this.statement();

    let elseBranch: Nullable<Stmt.Stmt> = null;

    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return new Stmt.If(condition, thenBranch, elseBranch);
  }

  private block() {
    const statements = [] as Stmt.Stmt[];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration()!);
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect } after block");
    return statements;
  }

  private printStatement(): Stmt.Stmt {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ; after value");
    return new Stmt.Print(value);
  }

  private expressionStatement(): Stmt.Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expected ; after statement");
    return new Stmt.Expression(expr);
  }

  private expression() {
    return this.assignment();
    // return this.equality();
  }

  private assignment(): Expr.Expr {
    let expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Expr.Variable) {
        const name = expr.name;
        return new Expr.Assign(name, value);
      } else if (expr instanceof Expr.Get) {
        const get = expr;
        return new Expr.Set(get.obj, get.name, value);
      }

      this.error(equals, "Invalid assignment target");
    }

    return expr;
  }

  private or() {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
  }

  private and() {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
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

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL
      )
    ) {
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

    return this.caall();
  }

  // js does not particularly like word "call"
  private caall(): Expr.Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expected property name after '.'"
        );
        expr = new Expr.Get(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expr.Expr): Expr.Expr {
    // js does not like "arguments" word either
    const argumentes: Expr.Expr[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (argumentes.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 arguments");
        }
        argumentes.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(
      TokenType.RIGHT_PAREN,
      "expect ) after arguments"
    );

    return new Expr.Call(callee, paren, argumentes);
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

    if (this.match(TokenType.SUPER)) {
      const keyword = this.previous();
      this.consume(TokenType.DOT, "Expect . after super");
      const method = this.consume(
        TokenType.IDENTIFIER,
        "expect superclass method name."
      );
      return new Expr.Super(keyword, method);
    }

    if (this.match(TokenType.THIS)) {
      return new Expr.This(this.previous());
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Expr.Variable(this.previous());
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
      return this.advance();
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

      this.advance();
    }
  }
}
