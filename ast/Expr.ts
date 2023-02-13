
// This code is autogenerated, check generateAst.ts


import { Token } from '../src/Token';
export interface Visitor<R> {
	visitAssignExpr(expr: Assign): R
	visitBinaryExpr(expr: Binary): R
	visitCallExpr(expr: Call): R
	visitGetExpr(expr: Get): R
	visitGroupingExpr(expr: Grouping): R
	visitLiteralExpr(expr: Literal): R
	visitLogicalExpr(expr: Logical): R
	visitSetExpr(expr: Set): R
	visitSuperExpr(expr: Super): R
	visitThisExpr(expr: This): R
	visitUnaryExpr(expr: Unary): R
	visitVariableExpr(expr: Variable): R
}

export abstract class Expr {
  abstract accept<R>(visitor: Visitor<R>): R;
};

    
export class Assign extends Expr {
      constructor(public name: Token, public value: Expr) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitAssignExpr(this);
  }

}
export class Binary extends Expr {
      constructor(public left: Expr, public operator: Token, public right: Expr) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBinaryExpr(this);
  }

}
export class Call extends Expr {
      constructor(public callee: Expr, public paren: Token, public args: Array<Expr>) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitCallExpr(this);
  }

}
export class Get extends Expr {
      constructor(public obj: Expr, public name: Token) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitGetExpr(this);
  }

}
export class Grouping extends Expr {
      constructor(public expression: Expr) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }

}
export class Literal extends Expr {
      constructor(public value: any) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }

}
export class Logical extends Expr {
      constructor(public left: Expr, public operator: Token, public right: Expr) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitLogicalExpr(this);
  }

}
export class Set extends Expr {
      constructor(public obj: Expr, public name: Token, public value: Expr) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitSetExpr(this);
  }

}
export class Super extends Expr {
      constructor(public keyword: Token, public method: Token) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitSuperExpr(this);
  }

}
export class This extends Expr {
      constructor(public keyword: Token) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitThisExpr(this);
  }

}
export class Unary extends Expr {
      constructor(public operator: Token, public right: Expr) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitUnaryExpr(this);
  }

}
export class Variable extends Expr {
      constructor(public name: Token) {
        super();
      };

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVariableExpr(this);
  }

}
