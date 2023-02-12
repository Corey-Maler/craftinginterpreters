import * as Expr from '../ast/Expr';


export class AstPrinter implements Expr.Visitor<string> {
  print(expr: Expr.Expr) {
    return expr.accept(this);
  }

  visitBinaryExpr(expr: Expr.Binary): string {
      return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: Expr.Grouping): string {
      return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: Expr.Literal): string {
    if (expr.value === null) {
      return 'nil';
    }

    return expr.value.toString();
  }

  visitUnaryExpr(expr: Expr.Unary): string {
      return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  visitVariableExpr(expr: Expr.Variable): string {
      return 'variable: ' + expr.name.lexeme;
  }

  private parenthesize(name: string, ...exprs: Expr.Expr[]) {
    let str = `(${name}`;
    for (const expr of exprs) {
      str += ' ';
      str += expr.accept(this);
    }
    str += ')';
    return str;
  }
}

