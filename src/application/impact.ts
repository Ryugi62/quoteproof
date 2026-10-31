export type Row = Record<string, string>;
export interface ImpactParams { N: number; s: number; a: number; c: number; q: number; u: number }

/** 파급(달러) = N × s × a × c × q × u (SPEC §19, docs/problem-scale.md 기호표). a=0 이면 0 — 하한을 숨기지 않는다. */
export const impactUsd = (p: ImpactParams) => p.N * p.s * p.a * p.c * p.q * p.u;

const supremeRe = /\d+ U\.S\. \d+|Supreme Court/;
const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : 0; };

/** Charlotin DB 행들에서 문제 규모 숫자를 센다. 단가 1 USD 는 자리표시값이라 뺀다. */
export function scale(rows: Row[]) {
  const us = rows.filter((r) => r["State(s)"] === "USA");
  const fqItems = (r: Row) => (r["Hallucination Items"] ?? "").split("||").filter((i) => i.includes("False Quote"));
  const usFq = us.filter((r) => fqItems(r).length > 0);
  const usFqSc = usFq.filter((r) => fqItems(r).some((i) => supremeRe.test(i)));
  const pen = us.map((r) => r["Monetary Penalty"]?.match(/^\s*(\d+)\s*USD\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => Number(m[1])).filter((v) => v > 1);
  return { total: rows.length, us: us.length, usFalseQuote: usFq.length, usFalseQuoteSupreme: usFqSc.length, usPenalised: pen.length, penaltyMedianUsd: median(pen) };
}
