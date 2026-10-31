import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseCsv } from "../src/adapters/csv";
import { impactUsd, scale, type Row } from "../src/application/impact";

// SPEC §19: 파급 = 대상 N × 연방대법원 귀속 비율 s × 도입 비율 a × 탐지 비율 c × 제재 비율 q × 단가 u. a=0 이면 0(하한을 숨기지 않는다).
test("파급 식: 곱이 맞고 도입 비율 0이면 0", () => {
  const p = { N: 500, s: 0.1, a: 0.1, c: 1, q: 0.1, u: 2000 };
  expect(impactUsd(p)).toBeCloseTo(500 * 0.1 * 0.1 * 1 * 0.1 * 2000, 6);
  expect(impactUsd({ ...p, a: 0 })).toBe(0);
});

test("CSV 파서: 따옴표 안 쉼표·줄바꿈·이중 따옴표", () => {
  const rows = parseCsv('a,b\n"x, y","l1\nl2 ""q"""\n');
  expect(rows).toEqual([["a", "b"], ["x, y", 'l1\nl2 "q"']]);
});

test("scale: 합성 표본에서 건수·비율·중앙값", () => {
  const mk = (usa: boolean, items: string, pen: string): Row => ({ "State(s)": usa ? "USA" : "Canada", "Hallucination Items": items, "Monetary Penalty": pen });
  const rows = [
    mk(true, "False Quotes: Case Law | cites 410 U.S. 113 quote", "3000 USD"),
    mk(true, "False Quotes: Case Law | state case quote", ""),
    mk(true, "Fabricated: Case Law | x", "1 USD"),
    mk(false, "False Quotes: Case Law | y", "9000 USD"),
  ];
  const s = scale(rows);
  expect(s).toMatchObject({ total: 4, us: 3, usFalseQuote: 2, usFalseQuoteSupreme: 1, usPenalised: 1, penaltyMedianUsd: 3000 });
});

test("고정 CSV(2026-10-30)의 건수가 docs/problem-scale.md 표와 같다", () => {
  const rows = parseCsv(readFileSync(new URL("../fixtures/public-list/charlotin-ai-hallucination-cases-2026-10-30.csv", import.meta.url).pathname, "utf8"));
  const head = rows[0];
  const objs: Row[] = rows.slice(1).filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  const s = scale(objs);
  const doc = readFileSync(new URL("../docs/problem-scale.md", import.meta.url).pathname, "utf8");
  for (const n of [s.total, s.us, s.usFalseQuote, s.usFalseQuoteSupreme, s.usPenalised]) expect(doc).toContain(n.toLocaleString("en-US"));
  expect(doc).toContain(s.penaltyMedianUsd.toLocaleString("en-US"));
});
