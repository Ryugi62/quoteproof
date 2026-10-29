// 라이브 읽기 조립: robots.txt 준수(politeFetcher) + 네트워크 실패 시 고정 fixtures 폴백. CLI들이 공유한다(SPEC §14).
import { withFixtureFallback } from "./fallbackFetcher";
import { fixtureFetcher } from "./fixtureFetcher";
import { politeFetcher } from "./politeFetcher";
import type { Fetcher } from "../adapters/sources";

const UA = "Mozilla/5.0 (Macintosh) QuoteProof-cli/0.4";
/** QUOTEPROOF_ROBOTS=strict 이면 robots.txt가 막는 경로는 요청하지 않는다(그 출처는 못 읽은 것). 기본은 user-initiated. */
export function makePoliteGet(say: (m: string) => void, mode: "strict" | "user-initiated"): Fetcher {
  return politeFetcher({
    get: async (url) => { const r = await fetch(url, { headers: { "User-Agent": UA } }); return r.ok ? await r.text() : null; },
    now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)), mode, say,
    fallbackDelaySec: { "www.law.cornell.edu": 10 },
  });
}
export function makeLiveFetcher(say: (m: string) => void): Fetcher {
  const mode = process.env.QUOTEPROOF_ROBOTS === "strict" ? "strict" : "user-initiated";
  return withFixtureFallback(makePoliteGet(say, mode), fixtureFetcher, say);
}
