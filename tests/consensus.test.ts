import { describe, expect, test } from "bun:test";
import { identicalConsensus, type Observation } from "../src/application/consensus";
const o = (h: string): Observation => ({ verdict: "PASS", reasons: "", receiptHash: h, sourceSummary: "cap:found:x|lii:found:y" });
describe("identicalConsensus (n=4 → 쿼럼 3)", () => {
  test("4/4 동일", () => { const c = identicalConsensus([o("a"), o("a"), o("a"), o("a")]); expect(c.reached).toBe(true); expect(c.agree).toBe(4); });
  test("3/4 동일 → 합의", () => { expect(identicalConsensus([o("a"), o("a"), o("a"), o("b")]).reached).toBe(true); });
  test("2/4 → 합의 실패(출처 본문이 노드마다 다름)", () => { expect(identicalConsensus([o("a"), o("a"), o("b"), o("b")]).reached).toBe(false); });
});
