// 서면 텍스트에서 (Quote, Citation) 쌍을 뽑는다 — SPEC §10. 순수 함수: I/O 없음.
export type BriefStatus = "READY" | "NOT_CHECKED";
export type NotCheckedWhy = "NO_CITATION" | "UNSUPPORTED_REPORTER" | "UNRESOLVED_SHORT_CITE" | "ID_NO_ANTECEDENT" | "ID_ANTECEDENT_NOT_CHECKABLE" | "ID_AMBIGUOUS" | "UNRESOLVED_SUPRA";
export interface BriefQuote {
  index: number;            // 1부터
  quote: string;            // 따옴표 제외, 끝 쉼표·마침표 하나 제거
  citation: string | null;  // "372 U.S. 335" (READY일 때만)
  status: BriefStatus;
  why?: NotCheckedWhy;
}

const MIN_WORDS = 3;
const WINDOW = 250;
const FULL_US = /(\d{1,3})\s+U\.\s?S\.\s+(\d{1,4})(?!\d)/g;
const SHORT_US = /(\d{1,3})\s+U\.\s?S\.\s+at\s+\d+/g;
const OTHER = /\b\d{1,4}\s+(?:F\.\s?(?:2d|3d|4th)|F\.\s?Supp\.(?:\s?[23]d)?|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?2d)?|P\.\s?[23]d|N\.\s?[EW]\.\s?[23]d|S\.\s?[EW]\.\s?[23]d|So\.\s?[23]d|A\.\s?[23]d|Cal\.\s?Rptr\.(?:\s?[23]d)?|N\.\s?Y\.\s?[23]d)\s+\d+/;

function spans(text: string): { start: number; end: number; raw: string }[] {
  const out: { start: number; end: number; raw: string }[] = [];
  const re = /“([^”]+)”|"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, raw: m[1] ?? m[2] });
  return out;
}
const clean = (raw: string) => raw.replace(/\s+/g, " ").trim().replace(/(?<!\.\s?\.)(?<!\.)[,.]$/, "").trim();

// ---- 인용 사건(Cite event): 문서 안의 모든 인용 표지를 위치 순으로 모은다 (SPEC §10·§15) ----
type Ev = { pos: number; end: number; kind: "FULL" | "SHORT" | "OTHER" | "ID" | "SUPRA"; cite?: string; why?: NotCheckedWhy };
const ID_RE = /\bId\.(?:\s+at\s+\d+)?/g;
const SUPRA_RE = /\b([A-Z][A-Za-z'&.-]*(?:\s+(?:&|and)\s+[A-Z][A-Za-z'&.-]*)?),?\s+supra\b/g;
const OTHER_G = new RegExp(OTHER.source, "g");
const NAME_TOKEN = /^(?:[A-Z][\w'&-]*|&|and|of)$/;

/** 완전 인용 바로 앞 「<당사자1> v.」의 당사자1 낱말들. 문장 경계(마침표·숫자 토큰)에서 멈춘다. */
function party1(text: string, citePos: number): string {
  const before = text.slice(Math.max(0, citePos - 140), citePos);
  const vi = before.lastIndexOf(" v. ");
  if (vi < 0) return "";
  const toks = before.slice(0, vi).split(/\s+/).filter(Boolean);
  const keep: string[] = [];
  for (let i = toks.length - 1; i >= 0 && NAME_TOKEN.test(toks[i]); i--) keep.unshift(toks[i]);
  return keep.join(" ");
}

function collectEvents(text: string, fullByVol: Map<string, string[]>): Ev[] {
  const evs: Ev[] = [];
  const names: { name: string; cite: string }[] = [];
  for (const m of text.matchAll(FULL_US)) {
    const cite = `${m[1]} U.S. ${m[2]}`;
    evs.push({ pos: m.index!, end: m.index! + m[0].length, kind: "FULL", cite });
    names.push({ name: party1(text, m.index!), cite });
  }
  for (const m of text.matchAll(SHORT_US)) {
    const pages = fullByVol.get(m[1]) ?? [];
    evs.push({ pos: m.index!, end: m.index! + m[0].length, kind: "SHORT", ...(pages.length === 1 ? { cite: `${m[1]} U.S. ${pages[0]}` } : { why: "UNRESOLVED_SHORT_CITE" as const }) });
  }
  for (const m of text.matchAll(OTHER_G)) evs.push({ pos: m.index!, end: m.index! + m[0].length, kind: "OTHER", why: "UNSUPPORTED_REPORTER" });
  for (const m of text.matchAll(SUPRA_RE)) {
    const words = m[1].split(/\s+/);
    const hits = new Set(names.filter((n) => n.name && words.every((w) => n.name.split(/\s+/).includes(w))).map((n) => n.cite));
    evs.push({ pos: m.index!, end: m.index! + m[0].length, kind: "SUPRA", ...(hits.size === 1 ? { cite: [...hits][0] } : { why: "UNRESOLVED_SUPRA" as const }) });
  }
  for (const m of text.matchAll(ID_RE)) evs.push({ pos: m.index!, end: m.index! + m[0].length, kind: "ID" });
  evs.sort((a, b) => a.pos - b.pos);
  // 겹치는 표지(예: 「496 U.S. at 398」 안의 다른 정규식 조각)는 앞선 것만 남긴다
  const out: Ev[] = [];
  for (const e of evs) if (!out.length || e.pos >= out[out.length - 1].end) out.push(e);
  // Id.를 바로 앞 표지로 푼다(SPEC §15). 앞 표지가 ;로 이어진 복수 인용의 일부면 모호.
  for (let i = 0; i < out.length; i++) {
    if (out[i].kind !== "ID") continue;
    const prev = out[i - 1];
    if (!prev) { out[i].why = "ID_NO_ANTECEDENT"; continue; }
    if (prev.kind === "ID") { out[i].cite = prev.cite; out[i].why = prev.why; continue; }
    if (!prev.cite) { out[i].why = "ID_ANTECEDENT_NOT_CHECKABLE"; continue; }
    const pp = out.slice(0, i - 1).reverse().find((e) => e.kind !== "ID");
    if (pp && pp.cite !== prev.cite) {
      const gap = text.slice(pp.end, prev.pos);
      const beforeSemi = gap.split(";")[0];
      if (gap.includes(";") && gap.length < 250 && !/[.!?]["”]?\s+[A-Z]/.test(beforeSemi)) { out[i].why = "ID_AMBIGUOUS"; continue; }
    }
    out[i].cite = prev.cite;
  }
  return out;
}

/** [from,to) 안에서 Quote에 가장 가까운 인용 표지를 쓴다(v4: v3의 「완전 > 약식 > 다른 판례집」 우선순위는 다음 문단의 인용을 끌어다 쓸 수 있어 가까운 쪽으로 바꿨다). pick=first: Quote 뒤쪽 창, last: 앞쪽 창.
 *  end = 쓰인 표지가 끝난 절대 위치(뒤따르는 Quote가 앞쪽 인용으로 다시 쓰지 못하게 한다). */
function findCite(evs: Ev[], from: number, to: number, pick: "first" | "last"): { cite?: string; why?: NotCheckedWhy; end?: number } {
  const inWin = evs.filter((e) => e.pos >= from && e.end <= to);
  const e = pick === "first" ? inWin[0] : inWin[inWin.length - 1];
  if (!e) return {};
  return e.cite ? { cite: e.cite, end: e.end } : { why: e.why, end: e.end };
}

export function extractBriefQuotes(text: string): BriefQuote[] {
  const fullByVol = new Map<string, string[]>();
  for (const m of text.matchAll(FULL_US)) {
    const arr = fullByVol.get(m[1]) ?? [];
    if (!arr.includes(m[2])) arr.push(m[2]);
    fullByVol.set(m[1], arr);
  }
  const evs = collectEvents(text, fullByVol);
  const sp = spans(text);
  const rows: BriefQuote[] = [];
  let consumedUntil = 0;
  sp.forEach((s, i) => {
    const quote = clean(s.raw);
    if (quote.split(" ").filter(Boolean).length < MIN_WORDS) return;
    const afterEnd = Math.min(s.end + WINDOW, sp[i + 1]?.start ?? text.length);
    const beforeStart = Math.max(s.start - WINDOW, sp[i - 1]?.end ?? 0, consumedUntil);
    let r = findCite(evs, s.end, afterEnd, "first");
    if (r.end != null) consumedUntil = r.end;
    else r = findCite(evs, beforeStart, s.start, "last");
    const index = rows.length + 1;
    rows.push(r.cite ? { index, quote, citation: r.cite, status: "READY" } : { index, quote, citation: null, status: "NOT_CHECKED", why: r.why ?? "NO_CITATION" });
  });
  return rows;
}
