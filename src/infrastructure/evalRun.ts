import { readFileSync, writeFileSync } from "node:fs";
import { verifyQuote } from "../application/verifyQuote";
import { summarize, type LabelledCase } from "../application/evaluate";
import { capSource, liiSource } from "../adapters/sources";
import { fixtureFetcher } from "./fixtureFetcher";
import type { Receipt } from "../domain/types";

const root = new URL("../../fixtures/", import.meta.url).pathname;
const cap = capSource(fixtureFetcher), lii = liiSource(fixtureFetcher);
const HEADLINE = (g: string) => !g.startsWith("G9");
const pct = (r: { k: number; n: number; rate: number; lo: number; hi: number }) => `${r.k}/${r.n} = ${(r.rate * 100).toFixed(1)}% [${(r.lo * 100).toFixed(1)}–${(r.hi * 100).toFixed(1)}]`;

async function run(cases: LabelledCase[], sources: any[], minSources: number, clock: () => string, tol = false) {
  const m = new Map<string, Receipt>();
  for (const c of cases) m.set(c.id, await verifyQuote(c.citation, c.quote, sources, { minSources, clock, punctuationTolerance: tol }));
  return m;
}

const L: string[] = []; const json: any = {};
for (const [name, file] of [["개발셋(시드 20261030, 진단에 사용)", "testset.json"], ["홀드아웃(시드 20261031, 진단에 쓰지 않음)", "testset-holdout.json"]] as const) {
  const { cases } = JSON.parse(readFileSync(root + file, "utf8")) as { cases: LabelledCase[] };
  const nG = cases.filter((c) => c.label === "genuine" && HEADLINE(c.group)).length, nA = cases.filter((c) => c.label === "altered").length;
  L.push(`## ${name} — 진짜 ${nG}(G9 제외) · 변조 ${nA}`, `| 구성 | 오탐률(진짜인데 보류) | 누락률(변조인데 통과) | 오탐 건 |`, `|---|---|---|---|`);
  const t0 = "2026-10-30T00:00:00.000Z";
  const strict = await run(cases, [cap, lii], 2, () => t0);
  const strict2 = await run(cases, [cap, lii], 2, () => "2026-10-31T00:00:00.000Z");
  const tol = await run(cases, [cap, lii], 2, () => t0, true);
  const tol2 = await run(cases, [cap, lii], 2, () => "2026-10-31T00:00:00.000Z", true);
  const capOnly = await run(cases, [cap], 1, () => t0), liiOnly = await run(cases, [lii], 1, () => t0);
  const same = (a: Map<string, Receipt>, b: Map<string, Receipt>) => cases.every((c) => a.get(c.id)!.receiptHash === b.get(c.id)!.receiptHash);
  const rows: [string, Map<string, Receipt>][] = [["출처 2곳 합의·엄격(기본)", strict], ["출처 2곳 합의·부호 허용(사후 정책)", tol], ["CAP만", capOnly], ["LII만", liiOnly]];
  const res: any = {};
  for (const [label, m] of rows) { const s = summarize(cases, m, HEADLINE); res[label] = s; L.push(`| ${label}${label === "CAP만" ? " (순환 라벨: 진짜 인용을 CAP 본문에서 뽑아 0%는 구조상 당연, 외부 증거 아님)" : ""} | ${pct(s.falseHold)} | ${pct(s.falsePass)} | ${s.falseHoldIds.join(", ") || "-"} |`); }
  const g9 = cases.filter((c) => c.group.startsWith("G9")); L.push(``, `경계 사례 G9(사람 판단, 헤드라인 제외): 엄격 ${g9.filter((c) => strict.get(c.id)!.verdict === "HOLD").length}/${g9.length} 보류`);
  L.push(``, `| 그룹(엄격) | 건수 | 기대 | 어긋난 건 |`, `|---|---|---|---|`);
  for (const g of [...new Set(cases.map((c) => c.group))]) {
    const cs = cases.filter((c) => c.group === g); const lab = cs[0].label;
    const bad = cs.filter((c) => (lab === "genuine") !== (strict.get(c.id)!.verdict === "PASS"));
    L.push(`| ${g} | ${cs.length} | ${lab === "genuine" ? "PASS" : "HOLD"} | ${bad.length}${bad.length ? " (" + bad.map((c) => c.id + ":" + strict.get(c.id)!.reasons.join("/")).join(", ") + ")" : ""} |`);
  }
  const det = same(strict, strict2) && same(tol, tol2);
  L.push(``, `결정성: 시각을 바꿔 2회 실행 → 영수증 해시 ${det ? "전 건 동일" : "불일치 있음"} (${cases.length}건 × 2정책)`, ``);
  json[file] = { n: cases.length, deterministic: det, results: res,
    perCase: cases.map((c) => { const r = strict.get(c.id)!; return { id: c.id, group: c.group, label: c.label, citation: c.citation, quote: c.quote, verdict: r.verdict, reasons: r.reasons, edits: r.edits, receiptHash: r.receiptHash, cap: capOnly.get(c.id)!.verdict, lii: liiOnly.get(c.id)!.verdict, tolerant: tol.get(c.id)!.verdict }; }) };
}
console.log(L.join("\n"));
writeFileSync(root + "eval-results.json", JSON.stringify(json, null, 1));
writeFileSync(root + "eval-results.md", L.join("\n"));

// ── 공개 사례(실재 사건) ──
const pub = JSON.parse(readFileSync(root + "public-cases.json", "utf8"));
const P: string[] = [`## 공개 사례 — AI 조작 인용 목록(Charlotin DB)의 연방대법원 귀속 가짜 인용문 ${pub.cases.length}건 (법원이 「그 판결에 없다」고 판단)`, `| # | 사건(법원·날짜) | 귀속 판결 | 인용문 | 판정 | 사유 | CAP | LII |`, `|---|---|---|---|---|---|---|---|`];
let pubPass = 0;
for (const c of [...pub.cases, { ...pub.control, dbCase: "(참고) Smith v. Allwright에 귀속", court: "", date: "", attributedTo: "Smith v. Allwright" }]) {
  const r = await verifyQuote(c.citation, c.quote, [cap, lii], { clock: () => "-" });
  const rc = await verifyQuote(c.citation, c.quote, [cap], { minSources: 1, clock: () => "-" });
  const rl = await verifyQuote(c.citation, c.quote, [lii], { minSources: 1, clock: () => "-" });
  if (c.id !== "P1b" && r.verdict === "PASS") pubPass++;
  P.push(`| ${c.id} | ${c.dbCase} (${c.court} ${c.date}) | ${c.attributedTo} ${c.citation} | ${c.quote.slice(0, 60)}${c.quote.length > 60 ? "…" : ""} | ${r.verdict} | ${r.reasons.join("/") || "-"} | ${rc.verdict} | ${rl.verdict} |`);
}
P.push(``, `공개 사례 누락(통과해 버린 건): ${pubPass}/${pub.cases.length}`);
P.push(``, `### 목록에는 있으나 시험하지 못한 공개 사례 ${pub.deferred.length}건 (통과·보류 어느 쪽으로도 세지 않음)`, `| # | 사건(법원·날짜) | 귀속 판결 | 보류 사유 | 설명 |`, `|---|---|---|---|---|`);
for (const d of pub.deferred) P.push(`| ${d.id} | ${d.dbCase} (${d.court} ${d.date}) | ${d.attributedTo} ${d.citation} | ${d.holdReason === "NO_QUOTE_TEXT" ? "인용문 원문 없음" : "지원 밖(하급심)"} | ${d.note} |`);
P.push(``, `공개 사례 합계: 시험 ${pub.cases.length} + 시험 불가 ${pub.deferred.length} = ${pub.cases.length + pub.deferred.length}건`);
console.log(P.join("\n"));
writeFileSync(root + "eval-results.md", L.join("\n") + "\n\n" + P.join("\n"));
