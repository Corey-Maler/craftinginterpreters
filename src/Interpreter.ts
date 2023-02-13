import { throws } from "assert";
import * as Expr from "../ast/Expr";
import * as Stmt from "../ast/Stmt";
import { Environment } from "./Environment";
import { Return, RuntimeError } from "./Errors";
import { LoxCallable } from "./LoxCallable";
import { LoxClass } from "./LoxClass";
import { LoxFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";
import { Lox } from "./main";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Interpreter implements Expr.Visitor<any>, Stmt.Visitor<void> {
  public readonly globals = new Environment();
  private environment = this.globals;

  private locals = new Map<Expr.Expr, number>();

  constructor() {
    const clock: LoxCallable = {
      arity() {
        return 0;
      },

      caall() {
        return Date.now() / 1000;
      },

      toString() {
        return "<native fn>";
      },
    };
    this.globals.define("clock", clock);
  }

  public interpret(statements: Stmt.Stmt[]) {
    try {
      for (const stmt of statements) {
        this.execute(stmt);
      }
    } catch (e: unknown) {
      if (e instanceof RuntimeError) {
        Lox.runtimeError(e);
        return;
      }

      throw e;
    }
  }

  public resolve(expr: Expr.Expr, depth: number) {
    this.locals.set(expr, depth);
  }

  visitThisExpr(expr: Expr.This) {
    return this.lookupVariable(expr.keyword, expr);
  }

  visitSetExpr(expr: Expr.Set): any {
    const obj = this.evaluate(expr.obj);

    if (!(obj instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields");
    }

    const value = this.evaluate(expr.value);
    obj.set(expr.name, value);
    return value;
  }

  visitGetExpr(expr: Expr.Get) {
    const obj = this.evaluate(expr.obj) as any;
    if (obj instanceof LoxInstance) {
      return obj.get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  visitSuperExpr(expr: Expr.Super) {
      const distance = this.locals.get(expr)!;
      const superklass = this.environment.getAt(distance, "super") as LoxClass;
  
      const object = this.environment.getAt(distance - 1, 'this');

      const method = superklass.findMethod(expr.method.lexeme) as LoxFunction;

      if (!method) {
        throw new RuntimeError(expr.method, "Undefined property " + expr.method.lexeme + '.')
      }

      return method.bind(object);
  }

  visitClassStmt(stmt: Stmt.Class): void {

    let superklass = null;
    if (stmt.superklass) {
      superklass = this.evaluate(stmt.superklass);
      if (!(superklass instanceof LoxClass)) {
        throw new RuntimeError(stmt.superklass.name, "Superclass must be a class.")
      }
    }

    this.environment.define(stmt.name.lexeme, null);

    if (stmt.superklass) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superklass);
    }

    const methods = new Map<string, LoxFunction>();

    for (const method of stmt.methods) {
      const funct = new LoxFunction(method, this.environment, method.name.lexeme === 'init');
      methods.set(method.name.lexeme, funct);
    }

    const klass = new LoxClass(stmt.name.lexeme, superklass, methods);

    if (superklass) {
      this.environment = this.environment.enclosing!;
    }

    this.environment.assign(stmt.name, klass);
  }

  visitReturnStmt(stmt: Stmt.Return): void {
    let value = null;
    if (stmt.value !== null) {
      value = this.evaluate(stmt.value);
    }

    throw new Return(value);
  }

  visitFnctionStmt(stmt: Stmt.Fnction): void {
    const fnction = new LoxFunction(stmt, this.environment, false);
    this.environment.define(stmt.name.lexeme, fnction);
    return;
  }

  visitCallExpr(expr: Expr.Call) {
    const callee = this.evaluate(expr.callee);

    const argumentes: any[] = [];

    for (const argument of expr.args) {
      argumentes.push(this.evaluate(argument));
    }

    if (!("caall" in callee)) {
      throw new RuntimeError(expr.paren, "not a function");
    }

    const fn = callee as LoxCallable;

    if (argumentes.length !== fn.arity()) {
      throw new RuntimeError(
        expr.paren,
        "Expected " +
          fn.arity() +
          " arguments but got " +
          argumentes.length +
          "."
      );
    }

    return fn.caall(this, argumentes);
  }

  visitWhileStmt(stmt: Stmt.While): void {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }

    return;
  }

  visitLogicalExpr(expr: Expr.Logical): any {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) {
        return left;
      }
    } else {
      if (!this.isTruthy(left)) {
        return left;
      }
    }

    return this.evaluate(expr.right);
  }

  visitIfStmt(stmt: Stmt.If): void {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }

    return;
  }

  visitBlockStmt(stmt: Stmt.Block): void {
    this.executeBlock(stmt.statements, new Environment(this.environment));
    return;
  }

  visitAssignExpr(expr: Expr.Assign) {
    const value = this.evaluate(expr.value) as any;

    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.environment.assign(expr.name, value);
    }
    return value;
  }

  visitVarStmt(stmt: Stmt.Var): void {
    let value = null;
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);

    return;
  }

  visitVariableExpr(expr: Expr.Variable) {
    return this.lookupVariable(expr.name, expr);
  }

  visitExpressionStmt(stmt: Stmt.Expression): void {
    this.evaluate(stmt.expression);
    return;
  }

  visitPrintStmt(stmt: Stmt.Print): void {
    const value = this.evaluate(stmt.expression);
    console.log(value);
    return;
  }

  visitLiteralExpr(expr: Expr.Literal) {
    return expr.value;
  }

  visitGroupingExpr(expr: Expr.Grouping): any {
    return this.evaluate(expr.expression);
  }

  visitUnaryExpr(expr: Expr.Unary): any {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return -(right as number);
    }

    // unreachable
    return null;
  }

  visitBinaryExpr(expr: Expr.Binary): any {
    const right = this.evaluate(expr.right);
    const left = this.evaluate(expr.left);

    const fLeft = parseFloat(left);
    const fRight = parseFloat(right);

    switch (expr.operator.type) {
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return fLeft < fRight;

      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return fLeft <= fRight;

      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return fLeft > fRight;

      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return fLeft >= fRight;

      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);

      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);

      case TokenType.PLUS: {
        // behave like js
        return left + right;
        /*
        if (
          typeof left === typeof right &&
          (typeof left === "string" || typeof left === "number")
        ) {
          return left + right;
        }

        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings"
        );
        */
      }

      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return parseFloat(left) - parseFloat(right);

      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return parseFloat(left) * parseFloat(right);

      case TokenType.SLASH:
        if (right === 0) {
          throw new RuntimeError(expr.operator, "Cannot devide by 0");
        }
        this.checkNumberOperands(expr.operator, left, right);
        return parseFloat(left) / parseFloat(right);
    }

    // unreachable
    return null;
  }

  private lookupVariable(name: Token, expr: Expr.Expr) {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  private execute(stmt: Stmt.Stmt) {
    stmt.accept(this);
  }

  public executeBlock(statements: Stmt.Stmt[], environment: Environment) {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  private isEqual(left: any, right: any) {
    if (left === null && right === null) {
      return true;
    }
    if (left === null) {
      return false;
    }

    return Object.is(left, right);
  }

  private isTruthy(val: any) {
    if (val === null) {
      return false;
    }

    if (typeof val === "boolean") {
      return val;
    }

    return true;
  }

  private evaluate(expr: Expr.Expr) {
    return expr.accept(this);
  }

  private checkNumberOperand(operator: Token, operand: any) {
    if (typeof operand === "number") {
      return;
    }

    throw new RuntimeError(operator, "Operand must be a number");
  }

  private checkNumberOperands(operator: Token, left: any, right: any) {
    if (typeof left === "number" && typeof right === "number") {
      return;
    }

    throw new RuntimeError(operator, "Operands must be numbers");
  }
}
