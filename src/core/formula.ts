/**
 * One tiny formula evaluator, shared by every tool that shows a computed number.
 *
 * Numbers, `+ - * /`, brackets, and the functions `min`, `max`, `sum`, `if`,
 * `abs`, `round`, `floor`, `ceil`. A bare identifier is read from `vars`; there
 * is no property access, no call syntax beyond that list and no `eval`. A
 * half-typed formula returns null so a sheet shows a dash instead of breaking.
 */

const CHARS = /^[a-z0-9_+\-*/().,%\s]+$/i;
const FUNCTIONS = ['min', 'max', 'sum', 'if', 'abs', 'round', 'floor', 'ceil'];

export function evaluateFormula(expression: string, vars: Record<string, number>): number | null {
  const text = String(expression ?? '').trim();
  if (!text || !CHARS.test(text)) return null;
  const found = text.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?|[()+\-*/,]/g);
  if (!found) return null;
  const tokens: string[] = found;
  let position = 0;

  const peek = (): string | undefined => tokens[position];

  function parseExpression(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[position];
      position += 1;
      const right = parseTerm();
      if (right === null) return null;
      left = operator === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;
    while (peek() === '*' || peek() === '/') {
      const operator = tokens[position];
      position += 1;
      const right = parseFactor();
      if (right === null) return null;
      if (operator === '/' && right === 0) return null;
      left = operator === '*' ? left * right : left / right;
    }
    return left;
  }

  function parseArgs(): number[] | null {
    if (peek() !== '(') return null;
    position += 1;
    const args: number[] = [];
    if (peek() === ')') {
      position += 1;
      return args;
    }
    for (;;) {
      const value = parseExpression();
      if (value === null) return null;
      args.push(value);
      if (peek() === ',') {
        position += 1;
        continue;
      }
      if (peek() !== ')') return null;
      position += 1;
      return args;
    }
  }

  function parseFactor(): number | null {
    const token = peek();
    if (token === undefined) return null;
    if (token === '(') {
      position += 1;
      const value = parseExpression();
      if (peek() !== ')') return null;
      position += 1;
      return value;
    }
    if (token === '-') {
      position += 1;
      const value = parseFactor();
      return value === null ? null : -value;
    }
    if (/^\d/.test(token)) {
      position += 1;
      return Number(token);
    }
    if (/^[a-zA-Z_]/.test(token)) {
      position += 1;
      const name = token.toLowerCase();
      if (FUNCTIONS.includes(name)) {
        const args = parseArgs();
        if (!args) return null;
        if (name === 'min') return args.length ? Math.min(...args) : null;
        if (name === 'max') return args.length ? Math.max(...args) : null;
        if (name === 'sum') return args.reduce((total, value) => total + value, 0);
        if (name === 'if') {
          if (args.length < 2) return null;
          return args[0] !== 0 ? args[1] : args[2] ?? 0;
        }
        if (name === 'round') return args.length ? Math.round(args[0]) : null;
        if (name === 'floor') return args.length ? Math.floor(args[0]) : null;
        if (name === 'ceil') return args.length ? Math.ceil(args[0]) : null;
        return args.length ? Math.abs(args[0]) : null;
      }
      return vars[name] ?? null;
    }
    return null;
  }

  const result = parseExpression();
  if (result === null || position !== tokens.length) return null;
  return Number.isFinite(result) ? result : null;
}
