// 문제 규모 숫자 재계산: bun run src/infrastructure/problemScaleCli.ts [csv경로]  (기본 = 고정 CSV)
import { readFileSync } from "node:fs";
import { parseCsv } from "../adapters/csv";
import { scale, impactUsd, type Row } from "../application/impact";

const path = process.argv[2] ?? new URL("../../fixtures/public-list/charlotin-ai-hallucination-cases-2026-10-30.csv", import.meta.url).pathname;
const rows = parseCsv(readFileSync(path, "utf8"));
const head = rows[0];
const s = scale(rows.slice(1).filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])) as Row));
console.log(JSON.stringify(s));
const sh = s.usFalseQuoteSupreme / s.usFalseQuote, q = s.usPenalised / s.us;
for (const [name, a, c] of [["low", 0, 0], ["base", 0.1, 1], ["high", 0.5, 1]] as const)
  console.log(name, `a=${a} c=${c}`, impactUsd({ N: s.usFalseQuote, s: sh, a, c, q, u: s.penaltyMedianUsd }).toFixed(0));
console.log(`s=${sh.toFixed(4)} q=${q.toFixed(4)}`);
