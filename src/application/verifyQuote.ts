import { matchQuoteNormalized } from "../domain/match";
import { loosen, normalizeText } from "../domain/normalize";
import { buildReceipt } from "../domain/receipt";
import { sha256Hex } from "../domain/sha256";
import type { Receipt, SourceMatch } from "../domain/types";
import type { Clock, OpinionSource } from "./ports";

export interface VerifyOptions { minSources?: number; clock?: Clock; punctuationTolerance?: boolean }
export interface SourceText { id: string; text: string }

/** 순수 동기 핵심: 이미 읽은 출처 본문들로 영수증을 낸다. CRE 워크플로(WASM)도 이 함수를 그대로 쓴다. */
export function verifyFromTexts(citation: string, quote: string, inputs: SourceText[], opt: VerifyOptions = {}): Receipt {
  const minSources = opt.minSources ?? 2;
  const clock = opt.clock ?? (() => new Date().toISOString());
  const texts: string[] = [];
  const results: SourceMatch[] = inputs.map((s) => {
    const text = normalizeText(s.text);
    texts.push(text);
    const m = matchQuoteNormalized(quote, text);
    return { id: s.id, textSha256: sha256Hex(text), found: m.found, start: m.start, end: m.end, edits: m.edits, distortion: m.distortion, reason: m.reason };
  });
  // 선택 정책: 한 출처에서 글자 그대로 찾았고 다른 출처에서는 쉼표·하이픈만 달라 못 찾은 경우, 낱말은 같다고 보고 variance로 기록한다.
  if (opt.punctuationTolerance && results.some((r) => r.found)) {
    results.forEach((r, i) => {
      if (r.found) return;
      const m = matchQuoteNormalized(loosen(quote), loosen(texts[i]));
      if (m.found && !m.distortion) results[i] = { ...r, found: true, start: m.start, end: m.end, edits: m.edits, distortion: false, reason: "OK", variance: "PUNCTUATION" };
    });
  }
  return buildReceipt({ citation, quote, sources: results, minSources, checkedAt: clock() });
}

/** Quote 하나를 출처 전부에서 대조하고 영수증을 낸다. 못 읽은 출처는 목록에서 빠져 INSUFFICIENT_SOURCES가 된다. */
export async function verifyQuote(citation: string, quote: string, sources: OpinionSource[], opt: VerifyOptions = {}): Promise<Receipt> {
  const inputs: SourceText[] = [];
  for (const s of sources) {
    let raw: string | null = null;
    try { raw = await s.readOpinion(citation); } catch { raw = null; }
    if (raw != null) inputs.push({ id: s.id, text: raw });
  }
  return verifyFromTexts(citation, quote, inputs, opt);
}
