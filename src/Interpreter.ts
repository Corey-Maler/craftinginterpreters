import { throws } from "assert";
import * as Expr from "../ast/Expr";
import { RuntimeError } from "./Errors";
import { Lox } from "./main";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Interpreter implements Expr.Visitor<any> {
  public interpret(expression: Expr.Expr) {
    try {
      const value = this.evaluate(expression);
      console.log(">> result", value);
    } catch (e: unknown) {
      if (e instanceof RuntimeError) {
        Lox.runtimeError(e);
        return;
      }

      throw e;
    }
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
