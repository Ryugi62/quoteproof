// QuoteProof 도메인 타입 — SPEC.md §2 유비쿼터스 언어와 이름이 같다.
export type SourceId = string;
export type Verdict = "PASS" | "HOLD";
export type HoldReason =
  | "NOT_IN_OPINION" | "SOURCE_DISAGREE" | "DISTORTION" | "INSUFFICIENT_SOURCES"
  | "BRACKET_REPLACES_CONTENT_WORD";

/** 출처 하나가 Opinion에서 Quote를 찾은 결과. */
export interface SourceMatch {
  id: SourceId;
  textSha256: string;   // 그 출처에서 받은 정규화 본문의 해시(출처 본문이 바뀌면 영수증 해시도 바뀐다)
  found: boolean;
  start: number;        // 정규화 본문 안의 문자 위치(못 찾으면 -1)
  end: number;
  edits: string[];      // 허용 편집 종류(정렬·중복 제거)
  distortion: boolean;  // 문맥 왜곡 의심
  reason: string;       // OK | NOT_FOUND | DISTORTION | BRACKET_REPLACES_CONTENT_WORD
  variance?: "PUNCTUATION"; // 이 출처에서는 쉼표·하이픈 등만 달라 찾은 경우(옵션 punctuationTolerance, 위치는 느슨화한 본문 기준)
}

export interface Receipt {
  citation: string;
  quote: string;        // 정규화된 Quote
  verdict: Verdict;
  reasons: string[];
  edits: string[];
  minSources: number;
  sources: SourceMatch[];
  checkedAt: string;    // 해시에서 제외
  receiptHash: string;
}
