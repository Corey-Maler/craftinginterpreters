import * as Expr from "../ast/Expr";
import * as Stmt from "../ast/Stmt";
import { ClassType } from "./ClassType";
import { FunctionType } from "./FunctionType";
import { Interpreter } from "./Interpreter";
import { Lox } from "./main";
import { Token } from "./Token";
import { Stack } from "./utils/stack";

export class Resolver implements Expr.Visitor<void>, Stmt.Visitor<void> {
  private scopes = new Stack<Map<string, Boolean>>();
  private currentFunction = FunctionType.NONE;
  private currentClass = ClassType.NONE;

  constructor(private readonly interpreter: Interpreter) {}

  visitSuperExpr(expr: Expr.Super): void {
    if (this.currentClass === ClassType.NONE) {
      Lox.error(expr.keyword, "Can't use 'super' outside of a class.");
    } else if (this.currentClass !== ClassType.SUBCLASS) {
      Lox.error(
        expr.keyword,
        "Can't use 'super' in a class with no superclass."
      );
    }
    this.resolveLocal(expr, expr.keyword);
  }

  visitSetExpr(expr: Expr.Set): void {
    this.resolve(expr.value);
    this.resolve(expr.obj);
  }

  visitGetExpr(expr: Expr.Get): void {
    this.resolve(expr.obj);
  }

  visitClassStmt(stmt: Stmt.Class): void {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;
    this.declare(stmt.name);
    this.define(stmt.name);

    if (stmt.superklass && stmt.name.lexeme === stmt.superklass.name.lexeme) {
      Lox.error(stmt.superklass.name, "A class can't inherit from itself.");
    }

    if (stmt.superklass) {
      this.currentClass = ClassType.SUBCLASS;
      this.resolve(stmt.superklass);
    }

    if (stmt.superklass) {
      this.beginScope();
      this.scopes.peek().set("super", true);
    }

    this.beginScope();
    this.scopes.peek().set("this", true);

    for (const method of stmt.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexeme === "init") {
        declaration = FunctionType.INITIALIZER;
      }
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (stmt.superklass) {
      this.endScope();
    }

    this.currentClass = enclosingClass;
  }

  visitThisExpr(expr: Expr.This): void {
    if (this.currentClass === ClassType.NONE) {
      Lox.error(expr.keyword, "Can't use 'this' outside of a class.");
      return;
    }
    this.resolveLocal(expr, expr.keyword);
  }

  visitBlockStmt(stmt: Stmt.Block): void {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
  }

  visitVarStmt(stmt: Stmt.Var): void {
    this.declare(stmt.name);
    if (stmt.initializer) {
      this.resolve(stmt.initializer);
    }

    this.define(stmt.name);
  }

  visitVariableExpr(expr: Expr.Variable): void {
    const scopes = this.scopes;
    if (!scopes.isEmpty() && scopes.peek().get(expr.name.lexeme) === false) {
      Lox.error(expr.name, "Can't read local variable in its own initializer.");
    }

    this.resolveLocal(expr, expr.name);
  }

  visitAssignExpr(expr: Expr.Assign): void {
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitFnctionStmt(stmt: Stmt.Fnction): void {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolveFunction(stmt, FunctionType.FUNCTION);
  }

  visitExpressionStmt(stmt: Stmt.Expression): void {
    this.resolve(stmt.expression);
  }

  visitIfStmt(stmt: Stmt.If): void {
    this.resolve(stmt.condition);
    this.resolve(stmt.thenBranch);
    if (stmt.elseBranch) {
      this.resolve(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: Stmt.Print): void {
    this.resolve(stmt.expression);
  }

  visitReturnStmt(stmt: Stmt.Return): void {
    if (this.currentFunction == FunctionType.NONE) {
      Lox.error(stmt.keyword, "Can't return from top-level code.");
    }
    if (stmt.value) {
      if (this.currentFunction === FunctionType.INITIALIZER) {
        Lox.error(stmt.keyword, "Can't return a value from an initializer");
      }
      this.resolve(stmt.value);
    }
  }

  visitWhileStmt(stmt: Stmt.While): void {
    this.resolve(stmt.condition);
    this.resolve(stmt.body);
  }

  visitBinaryExpr(expr: Expr.Binary): void {
    this.resolve(expr.left);
    this.resolve(expr.right);
  }

  visitCallExpr(expr: Expr.Call): void {
    this.resolve(expr.callee);
    for (const arg of expr.args) {
      this.resolve(arg);
    }
  }

  visitGroupingExpr(expr: Expr.Grouping): void {
    this.resolve(expr.expression);
  }

  visitLiteralExpr(expr: Expr.Literal): void {}

  visitLogicalExpr(expr: Expr.Logical): void {
    this.resolve(expr.left);
    this.resolve(expr.right);
  }

  visitUnaryExpr(expr: Expr.Unary): void {
    this.resolve(expr.right);
  }

  public resolve(statements: Stmt.Stmt[] | Stmt.Stmt | Expr.Expr) {
    if (Array.isArray(statements)) {
      for (const statement of statements) {
        this.resolve(statement);
      }
    } else {
      statements.accept(this);
    }
  }

  private resolveLocal(expr: Expr.Expr, name: Token) {
    const scopes = this.scopes;
    for (let i = scopes.size() - 1; i >= 0; i--) {
      if (scopes.get(i).has(name.lexeme)) {
        this.interpreter.resolve(expr, scopes.size() - 1 - i);
        return;
      }
    }
  }

  private resolveFunction(fnction: Stmt.Fnction, type: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;
    this.beginScope();
    for (const token of fnction.params) {
      this.declare(token);
      this.define(token);
    }
    this.resolve(fnction.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  private beginScope() {
    this.scopes.push(new Map());
  }

  private endScope() {
    this.scopes.pop();
  }

  private declare(token: Token) {
    if (this.scopes.isEmpty()) {
      return;
    }

    const scope = this.scopes.peek();
    if (scope.has(token.lexeme)) {
      Lox.error(token, "Already a variable with this name in this scope.");
    }
    scope.set(token.lexeme, false);
  }

  private define(name: Token) {
    if (this.scopes.isEmpty()) {
      return;
    }

    this.scopes.peek().set(name.lexeme, true);
  }
}
