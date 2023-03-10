import * as Expr from './ast/Expr';
import { AstPrinter } from './src/AstPrinter';
import { Token } from './src/Token';
import { TokenType } from './src/TokenType';

const exp = new Expr.Binary(
  new Expr.Unary(
    new Token(TokenType.MINUS, '-', null, 1),
    new Expr.Literal(123),
  ),
  new Token(TokenType.STAR, "*", null, 1),
  new Expr.Grouping(
    new Expr.Literal(45.67)
  )
)

console.log(new AstPrinter().print(exp));
