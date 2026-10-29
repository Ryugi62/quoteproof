import { formEdits, normalizeText } from "./normalize";

export interface MatchResult {
  found: boolean;
  start: number;
  end: number;
  edits: string[];
  distortion: boolean;
  reason: "OK" | "NOT_FOUND" | "DISTORTION" | "BRACKET_REPLACES_CONTENT_WORD";
}

/** 생략된 구간이 이보다 길면 서로 무관한 조각을 이어 붙인 것으로 본다(보류). */
export const MAX_GAP = 2500;

const NEGATION = /\b(?:not|no|never|neither|nor|none|nothing|nobody|nowhere|cannot|without|unless|except)\b|n't\b/i;
const FUNCTION_WORDS = [
  "the", "a", "an", "he", "she", "it", "they", "we", "you", "i", "him", "her", "them", "his", "hers", "its", "their", "theirs",
  "our", "your", "my", "me", "us", "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", "being", "am",
  "do", "does", "did", "has", "have", "had", "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "who", "whom", "which", "what", "there", "here", "and", "or", "but", "if", "as", "of", "to", "in", "on", "at", "by", "for",
  "with", "from", "then", "so", "also", "such",
];
const ELLIPSIS_SRC = "\\u2026|\\.\\s\\.\\s\\.(?:\\s\\.)?|\\.{3,4}";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FW = `(?:${FUNCTION_WORDS.join("|")})`;
const ANYW = `[A-Za-z0-9'-]+`;
const LETTER_WILD = `[A-Za-z']{0,3}`;

interface Compiled { strict: RegExp; relaxed: RegExp; hasWordBracket: boolean; bracketNegation: boolean; edits: string[] }

/** 괄호 깊이를 보며 공백으로 토큰 분리. */
function tokenize(seg: string): string[] {
  const out: string[] = []; let cur = ""; let depth = 0;
  for (const ch of seg) {
    if (ch === "[") depth++;
    if (ch === "]") depth = Math.max(0, depth - 1);
    if (ch === " " && depth === 0) { if (cur) out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function compileSegment(seg: string): Compiled {
  const edits: string[] = []; let hasWordBracket = false; let bracketNegation = false;
  const build = (wild: string): string => {
    let src = ""; let needsSep = false;
    for (const tok of tokenize(seg)) {
      const wb = tok.match(/^\[([^\]]*)\]([^\w[\]]*)$/);
      if (wb) {
        hasWordBracket = true; edits.push("BRACKET_WORD");
        if (NEGATION.test(wb[1])) bracketNegation = true;
        const punct = wb[2] ? `(?:${esc(wb[2])})?` : "";
        const w = `(?:(${wild})(?:\\s+(${wild}))?${punct})`;
        if (needsSep) src += `(?:\\s+${w})?`;
        else src += `(?:${w}\\s+)?`;
        continue;
      }
      let piece = ""; let last = 0;
      for (const m of tok.matchAll(/\[([^\]]*)\]/g)) {
        piece += esc(tok.slice(last, m.index));
        const c = m[1]; const idx = m.index!;
        const prefix = idx === 0; const after = idx + m[0].length;
        if (NEGATION.test(c)) bracketNegation = true;
        if (prefix && /^[A-Za-z]{1,3}$/.test(c)) { piece += [...c].map((x) => `[${x.toLowerCase()}${x.toUpperCase()}]`).join(""); edits.push("BRACKET_CASE"); }
        else if (prefix && c === "") { piece += `(?:[A-Za-z]{1,3})?`; edits.push("BRACKET_CASE"); }
        else if (!prefix) { piece += LETTER_WILD; edits.push("BRACKET_SUFFIX"); }
        else piece += esc(m[0]);
        last = after;
      }
      piece += esc(tok.slice(last));
      src += (needsSep ? "\\s+" : "") + piece; needsSep = true;
    }
    const startsWord = /^[\w[]/.test(seg); const endsWord = /[\w\]]$/.test(seg);
    return `${startsWord ? "(?<![A-Za-z0-9])" : ""}${src}${endsWord ? "(?![A-Za-z0-9])" : ""}`;
  };
  const strictSrc = build(FW);
  const relaxedSrc = build(ANYW);
  return { strict: new RegExp(strictSrc, "g"), relaxed: new RegExp(relaxedSrc, "g"), hasWordBracket, bracketNegation, edits };
}

interface Hit { start: number; end: number; groups: string[] }

function* hitsFrom(re: RegExp, text: string, from: number): Generator<Hit> {
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[0].length === 0) { re.lastIndex = m.index + 1; continue; }
    yield { start: m.index, end: m.index + m[0].length, groups: m.slice(1).filter((x): x is string => !!x) };
    re.lastIndex = m.index + 1; // 겹치는 후보도 본다
  }
}

function chain(regs: RegExp[], text: string): Hit[] | null {
  for (const h0 of hitsFrom(regs[0], text, 0)) {
    const hits = [h0]; let ok = true;
    for (let i = 1; i < regs.length && ok; i++) {
      const prev = hits[i - 1]; let found: Hit | null = null;
      for (const h of hitsFrom(regs[i], text, prev.end)) {
        if (h.start - prev.end > MAX_GAP) break;
        found = h; break;
      }
      if (found) hits.push(found); else ok = false;
    }
    if (ok) return hits;
  }
  return null;
}

const TERM = /[.!?]["')\]]*\s+(?=["'(\[]?[A-Z])/g;
const endsSentence = (s: string) => /[.!?]["')\]]*$/.test(s);
function firstTerminatorEnd(s: string): number { TERM.lastIndex = 0; const m = TERM.exec(s); return m ? m.index + 1 : s.length; }
function afterLastTerminator(s: string): string { TERM.lastIndex = 0; let last = -1; let m; while ((m = TERM.exec(s))) last = m.index + m[0].length; return last < 0 ? s : s.slice(last); }

/** 생략이 같은 문장 안에서 부정어를 지웠는가. */
function omissionDistortion(text: string, hits: Hit[], leading: boolean, trailing: boolean): boolean {
  for (let i = 0; i + 1 < hits.length; i++) {
    const gap = text.slice(hits[i].end, hits[i + 1].start);
    const prevText = text.slice(hits[i].start, hits[i].end);
    const left = endsSentence(prevText) ? "" : gap.slice(0, firstTerminatorEnd(gap));
    const tail = text.slice(hits[i + 1].start, hits[i + 1].start + 1);
    const right = afterLastTerminator(gap + tail).slice(0, -1); // 다음 조각의 첫 글자까지 봐야 문장 경계가 선다
    if (NEGATION.test(left) || NEGATION.test(right)) return true;
  }
  if (leading) {
    const before = text.slice(Math.max(0, hits[0].start - 600), hits[0].start);
    if (NEGATION.test(afterLastTerminator(before))) return true;
  }
  if (trailing) {
    const h = hits[hits.length - 1]; const after = text.slice(h.end, h.end + 600);
    if (!endsSentence(text.slice(h.start, h.end)) && NEGATION.test(after.slice(0, firstTerminatorEnd(after)))) return true;
  }
  return false;
}

export function matchQuoteNormalized(quoteRaw: string, opinion: string): MatchResult {
  const edits = new Set<string>(formEdits(quoteRaw));
  const q = normalizeText(quoteRaw);
  const ell = new RegExp(`\\s*(?:${ELLIPSIS_SRC})\\s*`, "g");
  const pieces = q.split(ell);
  const hasEllipsis = pieces.length > 1;
  if (hasEllipsis) edits.add("ELLIPSIS");
  const leading = hasEllipsis && pieces[0].trim() === "";
  const trailing = hasEllipsis && pieces[pieces.length - 1].trim() === "";
  const segs = pieces.map((p) => p.trim()).filter(Boolean);
  const fail = (reason: MatchResult["reason"]): MatchResult => ({ found: false, start: -1, end: -1, edits: [...edits].sort(), distortion: false, reason });
  if (segs.length === 0) return fail("NOT_FOUND");
  const comp = segs.map(compileSegment);
  comp.forEach((c) => c.edits.forEach((e) => edits.add(e)));
  const bracketNeg = comp.some((c) => c.bracketNegation);

  const ok = (hits: Hit[], extraDistortion: boolean): MatchResult => {
    const distortion = extraDistortion || bracketNeg || omissionDistortion(opinion, hits, leading, trailing);
    return { found: true, start: hits[0].start, end: hits[hits.length - 1].end, edits: [...edits].sort(), distortion, reason: distortion ? "DISTORTION" : "OK" };
  };
  const strictHits = chain(comp.map((c) => c.strict), opinion);
  if (strictHits) return ok(strictHits, false);
  if (comp.some((c) => c.hasWordBracket)) {
    const relaxedHits = chain(comp.map((c) => c.relaxed), opinion);
    if (relaxedHits) {
      const replaced = relaxedHits.flatMap((h) => h.groups).join(" ");
      if (NEGATION.test(replaced)) return ok(relaxedHits, true); // 대괄호가 지운 원문의 부정어
      return fail("BRACKET_REPLACES_CONTENT_WORD");
    }
  }
  return fail("NOT_FOUND");
}

/** 편의 함수: 본문도 정규화한다. 위치는 정규화된 본문 기준. */
export function matchQuote(quoteRaw: string, opinionText: string): MatchResult {
  return matchQuoteNormalized(quoteRaw, normalizeText(opinionText));
}
