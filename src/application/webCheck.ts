import { verifyFromTexts, type SourceText, type VerifyOptions } from "./verifyQuote";
import type { Receipt } from "../domain/types";

/** SPEC §18: 웹 데모가 묶어 쓰는 판결 본문. 항목마다 두 출처(CAP·LII)의 본문과 공개 주소. */
export interface BundledOpinion { cite: string; name: string; sources: SourceText[] }
export type Bundle = BundledOpinion[];
export type WebResult = { kind: "receipt"; receipt: Receipt; name: string } | { kind: "not_bundled"; citation: string };

const norm = (c: string) => c.replace(/U\.\s?S\./i, "U.S.").replace(/\s+/g, " ").trim().toLowerCase();

/** CLI와 같은 verifyFromTexts 로 대조한다(규칙 사본 없음). 묶음에 없는 인용은 통과시키지 않고 not_bundled. */
export function checkBundled(bundle: Bundle, citation: string, quote: string, opt: VerifyOptions = {}): WebResult {
  const hit = bundle.find((b) => norm(b.cite) === norm(citation));
  if (!hit) return { kind: "not_bundled", citation };
  return { kind: "receipt", name: hit.name, receipt: verifyFromTexts(hit.cite, quote, hit.sources, opt) };
}
