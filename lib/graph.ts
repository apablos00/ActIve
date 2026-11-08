// Parses a maths expression in x into a function, without eval.
// Supports + - * / ^, brackets, implicit "2x", pi, e and
// sin cos tan exp ln log sqrt abs. Returns null if it can't parse.

type Fn = (x: number) => number;

const FUNCS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
};

export function parseExpression(source: string): Fn | null {
  const src = source.toLowerCase().replace(/\s+/g, "").replace(/\*\*/g, "^").replace(/^y=|^f\(x\)=/, "");
  const tokens = src.match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|[-+*/^()]/g);
  if (!tokens || tokens.join("") !== src) return null;
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  // expr := term (('+'|'-') term)*
  const expr = (): Fn => {
    let left = term();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const a = left, b = term();
      left = op === "+" ? (x) => a(x) + b(x) : (x) => a(x) - b(x);
    }
    return left;
  };
  // term := unary (('*'|'/'|implicit) unary)*
  const term = (): Fn => {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t === "*" || t === "/") {
        next();
        const a = left, b = unary();
        left = t === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x);
      } else if (t !== undefined && (t === "(" || /^[a-z\d.]/.test(t))) {
        const a = left, b = unary(); // "2x", "3(x+1)"
        left = (x) => a(x) * b(x);
      } else return left;
    }
  };
  const unary = (): Fn => {
    if (peek() === "-") {
      next();
      const a = unary();
      return (x) => -a(x);
    }
    if (peek() === "+") next();
    return power();
  };
  // power := atom ('^' unary)?   (right-associative)
  const power = (): Fn => {
    const base = atom();
    if (peek() !== "^") return base;
    next();
    const exp = unary();
    return (x) => Math.pow(base(x), exp(x));
  };
  const atom = (): Fn => {
    const t = next();
    if (t === undefined) throw new Error("end");
    if (t === "(") {
      const inner = expr();
      if (next() !== ")") throw new Error(")");
      return inner;
    }
    if (/^[\d.]/.test(t)) {
      const v = Number(t);
      return () => v;
    }
    if (t === "x") return (x) => x;
    if (t === "pi") return () => Math.PI;
    if (t === "e") return () => Math.E;
    const f = FUNCS[t];
    if (f) {
      const arg = atom();
      return (x) => f(arg(x));
    }
    throw new Error(t);
  };

  try {
    const fn = expr();
    if (i !== tokens.length) return null;
    return fn;
  } catch {
    return null;
  }
}

export function slopeAt(f: Fn, x: number, span: number) {
  const h = span * 1e-4;
  return (f(x + h) - f(x - h)) / (2 * h);
}

// Round numbers for chalk labels: 1.25, 12.5, 125.
export function nice(v: number) {
  const a = Math.abs(v);
  return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(2).replace(/\.?0+$/, "");
}
