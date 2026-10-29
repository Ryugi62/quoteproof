// 시험셋 생성기(시드 고정). 정답 라벨은 「구성 방식」에서 나오며 판정기(matchQuote)를 호출하지 않는다.
// 변조 인용은 편집 없는 형태일 때 출처 본문에 부분 문자열로 존재하지 않음을 plain includes로 확인한다.
import { readFileSync, writeFileSync } from "node:fs";
import { CASES } from "./cases";

const root = new URL("../../fixtures/", import.meta.url).pathname;
const SEED = Number(process.argv[2] ?? 20261030);
const OUT = process.argv[3] ?? "testset.json";
let seed = SEED;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const NEG = /\b(?:not|no|never|neither|nor|none|nothing|nobody|cannot|without|unless|except)\b|n't/i;

const withLii = CASES.filter((c) => c.lii);
const texts: Record<string, string> = {};
for (const c of CASES) texts[c.slug] = JSON.parse(readFileSync(root + `raw/cap/${c.slug}.json`, "utf8")).casebody.opinions.map((o: any) => o.text).join("\n\n");
const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

interface Sent { slug: string; cite: string; text: string; idx: number }
const pool: Sent[] = [];
for (const c of withLii) {
  const body = texts[c.slug].split("\n\n")[0];
  const sents = body.split(/\n/).flatMap((p) => p.split(/(?<=[.?!])\s+(?=[A-Z])/));
  let k = 0;
  for (const s of sents) {
    k++;
    if (s.length < 110 || s.length > 280) continue;
    if (/[0-9()\[\]"“”§]|Id\.|supra|infra|\bv\.|\bU\.\s?S\.|Mr\.|Justice/.test(s)) continue;
    if (!/^[A-Z]/.test(s) || !/\.$/.test(s)) continue;
    pool.push({ slug: c.slug, cite: c.cite, text: norm(s), idx: texts[c.slug].indexOf(s) });
  }
}
const used = new Set<string>();
const takeSent = (filter: (s: Sent) => boolean = () => true): Sent => {
  for (let i = 0; i < 4000; i++) { const s = pick(pool); if (!used.has(s.text) && filter(s)) { used.add(s.text); return s; } }
  throw new Error("no sentence");
};
const words = (s: string) => s.split(" ");
const content = (w: string) => /^[a-z]{5,}$/.test(w);
const absent = (q: string, slug: string) => !norm(texts[slug]).includes(norm(q));

interface Case { id: string; group: string; label: "genuine" | "altered"; citation: string; quote: string; construction: string }
const out: Case[] = []; let n = 0;
const add = (group: string, label: Case["label"], s: Sent, quote: string, construction: string, citation = s.cite) => out.push({ id: `${label[0].toUpperCase()}${String(++n).padStart(3, "0")}`, group, label, citation, quote, construction });

// ── 진짜(genuine) ──
for (let i = 0; i < 5; i++) { const s = takeSent(); add("G1 전체 문장 그대로", "genuine", s, s.text, "CAP 본문의 한 문장 그대로"); }
for (let i = 0; i < 6; i++) { const s = takeSent(); const w = words(s.text); const a = 1 + Math.floor(rnd() * 3); const len = 8 + Math.floor(rnd() * 8); add("G2 문장 속 절 그대로", "genuine", s, w.slice(a, a + len).join(" "), `단어 ${a}~${a + len}`); }
for (let i = 0; i < 4; i++) { const s = takeSent(); const w = words(s.text); const mid = Math.floor(w.length / 2); const q = w.slice(0, mid).join(" ") + "\n" + w.slice(mid).join(" "); add("G3 둥근 따옴표·줄바꿈·겹공백", "genuine", s, q.replace(/'/g, "’").replace(" the ", "  the "), "중간 줄바꿈 + 겹공백 + 둥근 아포스트로피"); }
for (let i = 0; i < 6; i++) { const s = takeSent(); const w = words(s.text); const a = 3 + Math.floor(rnd() * 3), len = 3 + Math.floor(rnd() * 3); const omitted = w.slice(a, a + len).join(" "); if (NEG.test(omitted)) { i--; continue; } add("G4 문장 중간 생략(…)", "genuine", s, [...w.slice(0, a), "…", ...w.slice(a + len)].join(" "), `단어 ${a}~${a + len} 생략(부정어 없음)`); }
for (let i = 0; i < 3; i++) {
  const s1 = takeSent(); const w1 = words(s1.text); const keep1 = w1.slice(0, 6).join(" "); const rest1 = w1.slice(6).join(" ");
  const s2 = takeSent((x) => x.slug === s1.slug && x.idx > s1.idx + 200 && x.idx - s1.idx < 2000); const w2 = words(s2.text); const head2 = w2.slice(0, w2.length - 6).join(" "); const tail2 = w2.slice(w2.length - 6).join(" ");
  if (NEG.test(rest1) || NEG.test(head2)) { i--; continue; }
  add("G5 문장 이어 생략(. . .)", "genuine", s1, `${keep1} . . . ${tail2}`, "한 문장 머리 + 생략 + 같은 판결 다른 문장 꼬리(생략 구간 부정어 없음)");
  out[out.length - 1].citation = s1.cite; // 같은 판결이므로 인용은 s1과 같다
}
for (let i = 0; i < 4; i++) { const s = takeSent(); const w = words(s.text); const first = w[0]; const q = `[${first[0].toLowerCase()}]${first.slice(1)} ${w.slice(1, 12).join(" ")}`; add("G6 대괄호 대소문자 [t]he", "genuine", s, q, "문장 첫 글자를 [소문자]로"); }
for (let i = 0; i < 3; i++) {
  const s = takeSent((x) => /\b(he|she|it|they|we) /.test(x.text)); const w = words(s.text);
  const k = w.findIndex((x, j) => j > 2 && /^(he|she|it|they)$/.test(x)); if (k < 0) { i--; continue; }
  const sub = pick(["the defendant", "the Court", "the State", "the petitioner"]);
  add("G7 대괄호 대명사 치환 [the Court]", "genuine", s, [...w.slice(Math.max(0, k - 4), k), `[${sub}]`, ...w.slice(k + 1, k + 6)].join(" "), `대명사 '${w[k]}' → [${sub}]`);
}
for (let i = 0; i < 3; i++) {
  const s = takeSent(); const w = words(s.text); const lead = i % 2 === 0;
  if (lead) { const omitted = w.slice(0, 4).join(" "); if (NEG.test(omitted)) { i--; continue; } add("G8 앞·뒤 생략", "genuine", s, `… ${w.slice(4, 14).join(" ")}`, "앞 4단어 생략(부정어 없음)"); }
  else { const omitted = w.slice(9).join(" "); if (NEG.test(omitted)) { i--; continue; } add("G8 앞·뒤 생략", "genuine", s, `${w.slice(0, 9).join(" ")} …`, "9단어 뒤 전부 생략(부정어 없음)"); }
}
// G9: 생략한 절에 부정어가 있지만 대비 부연이라 뜻이 보존되는 경우 — 사람이 고른 경계 사례(판정기가 보류하면 오탐으로 센다)
for (let i = 0; i < 3; i++) {
  const s = takeSent((x) => /, (?:and )?not [^,]{4,40},/.test(x.text)); const m = s.text.match(/, ((?:and )?not [^,]{4,40}),/)!;
  const q = s.text.replace(m[0], " …,").replace(/ …,/, " …").replace(/\s+/g, " ");
  add("G9 대비 부연절 생략(부정어 포함, 뜻 보존)", "genuine", s, q.split(" ").slice(0, 22).join(" "), `절 「${m[1]}」 생략 — 사람 판단으로 뜻 보존`);
}

// ── 변조(altered) ──
const SYN: Record<string, string> = { held: "ruled", rule: "doctrine", court: "tribunal", states: "jurisdictions", right: "privilege", law: "statute", important: "critical", reasonable: "rational", fundamental: "basic", clearly: "plainly", decision: "judgment", ordinary: "typical" };
for (let i = 0; i < 6; i++) {
  const s = takeSent(); const w = words(s.text).slice(0, 16); const k = w.findIndex((x, j) => j > 1 && content(x.toLowerCase().replace(/[^a-z]/g, "")));
  if (k < 0) { i--; continue; }
  const bare = w[k].toLowerCase().replace(/[^a-z]/g, ""); const rep = SYN[bare] ?? pick(["necessary", "unusual", "obvious", "limited", "special", "serious", "narrow", "broad"]); if (rep === bare) { i--; continue; }
  const q = w.map((x, j) => j === k ? x.replace(bare, rep) : x).join(" "); if (!absent(q, s.slug)) { i--; continue; }
  add("A1 낱말 한 개 교체", "altered", s, q, `'${bare}' → '${rep}'`);
}
for (let i = 0; i < 4; i++) { const s = takeSent(); const w = words(s.text).slice(0, 15); const k = 3 + Math.floor(rnd() * 8); const ins = pick(["expressly", "only", "always", "unanimously", "clearly"]); const q = [...w.slice(0, k), ins, ...w.slice(k)].join(" "); if (!absent(q, s.slug)) { i--; continue; } add("A2 낱말 추가", "altered", s, q, `${k}번째 앞에 '${ins}' 삽입`); }
for (let i = 0; i < 3; i++) { const s = takeSent(); const w = words(s.text).slice(0, 15); const k = w.findIndex((x, j) => j > 2 && content(x)); if (k < 0) { i--; continue; } const q = w.filter((_, j) => j !== k).join(" "); if (!absent(q, s.slug)) { i--; continue; } add("A3 낱말 삭제(표시 없음)", "altered", s, q, `'${w[k]}' 삭제`); }
for (let i = 0; i < 5; i++) {
  const s = takeSent((x) => / (is|are|was|were|does|do|did|has|have|had|can|may|must|will|would) /.test(x.text)); const w = words(s.text).slice(0, 18); const k = w.findIndex((x, j) => j > 1 && /^(is|are|was|were|does|do|did|has|have|had|can|may|must|will|would)$/.test(x));
  if (k < 0) { i--; continue; }
  const q = [...w.slice(0, k + 1), "not", ...w.slice(k + 1)].join(" "); if (!absent(q, s.slug)) { i--; continue; }
  add("A4 부정어 끼워넣기", "altered", s, q, `'${w[k]}' 뒤에 not 삽입`);
}
for (let i = 0; i < 5; i++) {
  const s = takeSent((x) => /\b(not|no|never) /.test(x.text)); const w = words(s.text); const k = w.findIndex((x, j) => j >= 4 && j < w.length - 5 && /^(not|no|never)$/.test(x));
  if (k < 0) { i--; continue; }
  const q = [...w.slice(Math.max(0, k - 5), k - 1), "…", ...w.slice(k + 1, k + 6)].join(" "); // 부정어(와 그 앞 한 단어) 생략
  add("A5 생략으로 부정어 삭제", "altered", s, q, `'${w[k - 1]} ${w[k]}' 구간을 생략부호로 지워 뜻 반전`);
}
for (let i = 0; i < 4; i++) {
  const s = takeSent(); const w = words(s.text).slice(0, 15); const k = w.findIndex((x, j) => j > 3 && content(x)); if (k < 0) { i--; continue; }
  const rep = i < 2 ? pick(["[has been invalidated]", "[was overruled]", "[is prohibited]"]) : pick(["[does not]", "[is not]"]);
  const q = [...w.slice(0, k), rep, ...w.slice(k + 1)].join(" ");
  add("A6 대괄호로 내용어 세탁", "altered", s, q, `'${w[k]}' → ${rep}`);
}
for (let i = 0; i < 3; i++) {
  const s1 = takeSent(); const body = texts[s1.slug]; const s2 = takeSent((x) => x.slug === s1.slug && Math.abs(x.idx - s1.idx) > 6000);
  add("A7 먼 두 곳 이어붙이기(…)", "altered", s1, `${words(s1.text).slice(0, 8).join(" ")} … ${words(s2.text).slice(-7).join(" ")}`, `${Math.abs(s2.idx - s1.idx)}자 떨어진 두 문장 조각을 생략부호로 연결`);
  void body;
}
const INVENTED: [string, string][] = [
  ["410 U.S. 113", "We hold that a State may never regulate the practice of medicine before the point of viability."],
  ["372 U.S. 335", "The Constitution does not require that counsel be appointed for any defendant who can read and write."],
  ["393 U.S. 503", "Students retain their rights of expression only so long as the school administration approves of the message."],
  ["304 U.S. 64", "Federal courts sitting in diversity may always disregard the decisions of the highest court of the State."],
  ["466 U.S. 668", "Any error by counsel, however slight, entitles a defendant to a new trial without a showing of prejudice."],
];
for (const [cite, q] of INVENTED) { const c = CASES.find((x) => x.cite === cite)!; add("A8 통째로 지어낸 문장", "altered", { slug: c.slug, cite, text: q, idx: 0 }, q, "법률 문체로 쓴 가짜 문장(사람이 작성)"); }
for (let i = 0; i < 4; i++) {
  const s = takeSent(); const other = pick(withLii.filter((c) => c.slug !== s.slug)); if (!absent(s.text, other.slug)) { i--; continue; }
  add("A9 다른 판결에 귀속", "altered", s, s.text, `${s.cite}의 진짜 문장을 ${other.cite}의 인용으로 표기`, other.cite);
}
const TAILS = [" and therefore the statute must be struck down in every circumstance.", " and no court may ever revisit that conclusion.", " as the unanimous Court emphasized."];
for (let i = 0; i < 3; i++) { const s = takeSent(); const w = words(s.text); const q = w.slice(0, Math.floor(w.length * 0.6)).join(" ") + TAILS[i]; if (!absent(q, s.slug)) { i--; continue; } add("A11 앞부분 진짜 + 지어낸 꼬리", "altered", s, q, "진짜 문장 앞 60% + 지어낸 꼬리"); }

writeFileSync(root + OUT, JSON.stringify({ seed: SEED, builtAt: "2026-10-30", counts: { genuine: out.filter((c) => c.label === "genuine").length, altered: out.filter((c) => c.label === "altered").length }, cases: out }, null, 2));
console.log("genuine", out.filter((c) => c.label === "genuine").length, "altered", out.filter((c) => c.label === "altered").length, "pool", pool.length);
