import * as vectormath from './vectormath.js';
import {lexer, tokdef, token, parser, PUTLParseError} from './parseutil.js';

let tk = (n, r, f) => new tokdef(n, r, f);

let count = (str, match) => {
  let c = 0;
  do {
    let i = str.search(match);
    if (i < 0) {
      break;
    }

    c++;

    str = str.slice(i+1, str.length);
  } while (1);

  return c;
}

let tokens = [
  tk("ID", /[a-zA-Z$_]+[a-zA-Z0-9$_]*/),
  tk("NUM", /[0-9]+(\.[0-9]*)?/),
  tk("LPAREN", /\(/),
  tk("RPAREN", /\)/),
  tk("STRLIT", /".*(?<!\\)\"/, (t) => {
    let v = t.value;
    t.lexer.lineno += count(t.value, "\n");
    return t;
  }),
  tk("WS", /[ \t\n\r]/, (t) => {
    t.lexer.lineno += count(t.value, "\n");
    //drop token by not returning it
  }),
  tk("COMMA", /\,/),
  tk("COLON", /:/),
  tk("LSBRACKET", /\[/),
  tk("RSBRACKET", /\]/),
  tk("LBRACKET", /\{/),
  tk("RBRACKET", /\}/),
  tk("DOT", /\./),
  tk("PLUS", /\+/),
  tk("MINUS", /\-/),
  tk("TIMES", /\*/),
  tk("DIVIDE", /\//),
  tk("EXP", /\*\*/),
  tk("LAND", /\&\&/),
  tk("BAND", /\&/),
  tk("LOR", /\|\|/),
  tk("BOR", /\|/),
  tk("EQUALS", /=/),
  tk("LEQUALS", /\<\=/),
  tk("GEQUALS", /\>\=/),
  tk("LTHAN", /\</),
  tk("GTHAN", /\>/),
  tk("MOD", /\%/),
  tk("XOR", /\^/),
  tk("BITINV", /\~/)
];

let lex = new lexer(tokens, (t) => {
  console.log("Token error");
  return true;
});

let parse = new parser(lex);

let binops = new Set([
  ".", "/", "*", "**", "^", "%", "&", "+", "-", "&&", "||", "&", "|", "<",
  ">", "==", "=", "<=", ">="//, "(", ")"
]);

let precedence;

if (1) {
  let table = [
    ["**"],
    ["*", "/"],
    ["+", "-"],
    ["."],
    ["="],
    ["("],
    [")"]
//    [","],
//    ["("]
  ]

  let pr = {};
  for (let i = 0; i < table.length; i++) {
    for (let c of table[i]) {
      pr[c] = i;
    }
  }

  precedence = pr;
}


function indent(n, chr="  ") {
  let s = "";
  for (let i=0; i<n; i++) {
    s += chr;
  }

  return s;
}

export class Node extends Array {
  constructor(type) {
    super();
    this.type = type;
    this.parent = undefined;
  }

  push(n) {
    n.parent = this;
    return super.push(n);
  }

  remove(n) {
    let i = this.indexOf(n);

    if (i < 0) {
      console.log(n);
      throw new Error("item not in array");
    }

    while (i < this.length) {
      this[i] = this[i+1];
      i++;
    }

    n.parent = undefined;
    this.length--;

    return this;
  }

  insert(starti, n) {
    let i = this.length-1;
    this.length++;

    if (n.parent) {
      n.parent.remove(n);
    }

    while (i > starti) {
      this[i] = this[i-1];
      i--;
    }

    n.parent = this;
    this[starti] = n;

    return this;
  }

  replace(n, n2) {
    if (n2.parent) {
      n2.parent.remove(n2);
    }

    this[this.indexOf(n)] = n2;
    n.parent = undefined;
    n2.parent = this;

    return this;
  }

  toString(t=0) {
    let tab = indent(t, "-");

    let typestr = this.type;

    if (this.value !== undefined) {
      typestr +=  " : " + this.value;
    } else if (this.op !== undefined) {
      typestr += " (" + this.op + ")";
    }

    let s = tab + typestr + " {\n"
    for (let c of this) {
      s += c.toString(t+1);
    }
    s += tab + "}\n";

    return s;
  }
}

export function parseExpr(s) {
  let p = parse;

  function Value() {
    let t = p.next();


    if (t && t.value === "(") {
      t = p.next();
    }

    if (t === undefined) {
      p.error(undefined, "Expected a value");
      return;
    }

    let n = new Node();
    n.value = t.value;

    if (t.type === "ID") {
      n.type = "Ident";
    } else if (t.type === "NUM") {
      n.type = "Number";
    } else if (t.type === "STRLIT") {
      n.type = "StrLit";
    } else if (t.type === "MINUS") {
      let t2 = p.peek_i(0);
      if (t2 && t2.type === "NUM") {
        p.next();
        n.type = "Number";
        n.value = -t2.value;
      } else if (t2 && t2.type === "ID") {
        p.next();
        n.type = "Negate";

        let n2 = new Node();

        n2.type = "Ident"
        n2.value = t2.value;
        n.push(n2);
      } else {
        p.error(t, "Expected a value, not '" + t.value + "'");
      }
    } else {
      p.error(t, "Expected a value, not '" + t.value + "'");
    }

    return n;
  }


  function bin_next(depth=0) {
    let a = p.peek_i(0);
    let b = p.peek_i(1);

    console.log(indent(depth) + "bin_next", a.toString(), b?.toString());

    if (b && b.value === ")") {
      b.type = a.type;
      b.value = a.value;
      p.next();

      let c = p.peek_i(2);
      if (c && binops.has(c.value)) {
        return {
          value : b,
          op : c.value,
          prec : -10
        }
      }
    }
    if (b && binops.has(b.value)) {
      return {
        value : a,
        op : b.value,
        prec : precedence[b.value]
      }
    } else {
      return Value(a);
    }
  }

  function BinOp(left, depth=0) {
    console.log(indent(depth) + "BinOp", left.toString());
    let op = p.next();
    let right;

    let n;
    let prec = precedence[op.value]

    let r = bin_next(depth+1);

    if (r instanceof Node) {
      right = r;
    } else {
      if (r.prec > prec) {
        if (!n) {
          n = new Node("BinOp")
          n.op = op.value;
          n.push(left);
        }

        n.push(Value())

        return n;
      } else {
        right = BinOp(Value(), depth+2);
      }
    }

    n = new Node("BinOp", op);
    n.op = op.value;
    n.push(right);
    n.push(left);

    console.log("\n\n", n.toString(), "\n\n");
    left = n;

    console.log(n.toString());

    return n;

  }

  function Start() {
    let ret = Value();

    while (!p.at_end()) {
      let t = p.peek_i(0);
      //let n = p.peek_i(1);

      if (t === undefined) {
        break;
        //return Value();
      }

      console.log(t.toString()) //, n.toString())

      if (binops.has(t.value)) {
        console.log("binary op!");
        ret = BinOp(ret);
      } else if (t.value === ",") {
        let n = new Node();
        n.type = "ExprList";

        p.next();

        n.push(ret);
        let n2 = Start();
        if (n2.type === "ExprList") {
          for (let c of n2) {
            n.push(c);
          }
        } else {
          n.push(n2);
        }

        return n;
      } else if (t.value === "(") {
        let n = new Node("FuncCall");
        n.push(ret);
        n.push(Start());
        p.expect("RPAREN")
        return n;
      } else if (t.value === ")") {

        return ret;
      } else {
        //ret = Value();
        //break;
        console.log(ret.toString())
        p.error(t, "Unexpected token " + t.value);
      }
    }

    return ret;
  }

  function Run() {
    let ret = [];

    while (!p.at_end()) {
      ret.push(Start());
    }

    return ret;
  }

  p.start = Run;
  return p.parse(s);

  /*
  lex.input(s);
  let t = lex.next();
  while (t) {
    console.log(t.toString());
    t = lex.next();
  }
  //*/
}
