/**
 * Minimal evaluator for the subset of TaskRouter expressions used in this PoC:
 *   <attr.path> HAS "<value>"
 *   <attr.path> == "<value>" | == true | == false
 *   1==1
 * joined by AND / OR (AND binds tighter). Anything else throws, so the PoC never
 * silently mis-evaluates an unsupported production expression.
 */

type Attrs = Record<string, unknown>;

function lookup(attrs: Attrs, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Attrs)[part];
    return undefined;
  }, attrs);
}

function parseLiteral(raw: string): unknown {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  const m = /^"([^"]*)"$/.exec(t) ?? /^'([^']*)'$/.exec(t);
  if (m) return m[1];
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  throw new Error(`Unsupported literal in expression: ${raw}`);
}

function evalClause(clause: string, attrs: Attrs): boolean {
  const c = clause.trim();
  if (/^1\s*==\s*1$/.test(c)) return true;
  let m = /^([\w.]+)\s+HAS\s+(.+)$/i.exec(c);
  if (m) {
    const value = lookup(attrs, m[1]);
    return Array.isArray(value) && value.includes(parseLiteral(m[2]));
  }
  m = /^([\w.]+)\s*==\s*(.+)$/.exec(c);
  if (m) return lookup(attrs, m[1]) === parseLiteral(m[2]);
  throw new Error(`Unsupported expression clause: ${clause}`);
}

export function evaluateExpression(expression: string, attrs: Attrs): boolean {
  return expression
    .split(/\s+OR\s+/i)
    .some((orPart) => orPart.split(/\s+AND\s+/i).every((clause) => evalClause(clause, attrs)));
}
