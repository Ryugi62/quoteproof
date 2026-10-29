import { describe, expect, test } from "bun:test";
import { sha256Hex } from "../src/domain/sha256";
import { decide, buildReceipt } from "../src/domain/receipt";

describe("sha256", () => {
  test("표준 벡터", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

const src = (id: string, found: boolean, start = 3) => ({ id, textSha256: "h" + id, found, start: found ? start : -1, end: found ? start + 5 : -1, edits: [] as string[], distortion: false, reason: found ? "OK" : "NOT_FOUND" });

describe("decide — 출처 합의", () => {
  test("두 출처 모두 찾음 → PASS", () => { expect(decide([src("cap", true), src("lii", true)], 2).verdict).toBe("PASS"); });
  test("하나만 찾음 → SOURCE_DISAGREE", () => { const d = decide([src("cap", true), src("lii", false)], 2); expect(d.verdict).toBe("HOLD"); expect(d.reasons).toContain("SOURCE_DISAGREE"); });
  test("둘 다 못 찾음 → NOT_IN_OPINION", () => { expect(decide([src("cap", false), src("lii", false)], 2).reasons).toContain("NOT_IN_OPINION"); });
  test("출처 1곳 → INSUFFICIENT_SOURCES", () => { expect(decide([src("cap", true)], 2).reasons).toContain("INSUFFICIENT_SOURCES"); });
  test("왜곡 → DISTORTION", () => { const a = src("cap", true); a.distortion = true; expect(decide([a, src("lii", true)], 2).reasons).toContain("DISTORTION"); });
});

describe("buildReceipt — 결정성", () => {
  const base = { citation: "410 U.S. 113", quote: "the Court held", sources: [src("cap", true), src("lii", true)], minSources: 2 };
  test("시각이 달라도 같은 해시", () => {
    const a = buildReceipt({ ...base, checkedAt: "2026-10-30T00:00:00Z" });
    const b = buildReceipt({ ...base, checkedAt: "2026-10-31T09:00:00Z" });
    expect(a.receiptHash).toBe(b.receiptHash); expect(a.checkedAt).not.toBe(b.checkedAt);
  });
  test("본문 해시가 달라지면 해시도 달라짐", () => {
    const s2 = [src("cap", true), { ...src("lii", true), textSha256: "changed" }];
    expect(buildReceipt({ ...base, sources: s2, checkedAt: "t" }).receiptHash).not.toBe(buildReceipt({ ...base, checkedAt: "t" }).receiptHash);
  });
  test("출처 순서가 달라도 같은 해시", () => {
    const rev = { ...base, sources: [...base.sources].reverse() };
    expect(buildReceipt({ ...rev, checkedAt: "t" }).receiptHash).toBe(buildReceipt({ ...base, checkedAt: "t" }).receiptHash);
  });
});

describe("punctuationTolerance", () => {
  const mk = (text: string) => ({ id: "x", readOpinion: async () => text });
  const a = { id: "a", readOpinion: async () => "He held, in effect, that the over-bearing rule applies." };
  const b = { id: "b", readOpinion: async () => "He held in effect that the overbearing rule applies." };
  test("기본은 엄격: 부호만 달라도 SOURCE_DISAGREE", async () => {
    const { verifyQuote } = await import("../src/application/verifyQuote");
    const r = await verifyQuote("c", "held, in effect, that the over-bearing rule", [a, b]);
    expect(r.reasons).toContain("SOURCE_DISAGREE");
  });
  test("옵션을 켜면 variance로 기록하고 통과", async () => {
    const { verifyQuote } = await import("../src/application/verifyQuote");
    const r = await verifyQuote("c", "held, in effect, that the over-bearing rule", [a, b], { punctuationTolerance: true });
    expect(r.verdict).toBe("PASS"); expect(r.sources.find((s) => s.id === "b")!.variance).toBe("PUNCTUATION");
  });
  test("낱말이 다르면(추가) 옵션을 켜도 보류", async () => {
    const { verifyQuote } = await import("../src/application/verifyQuote");
    const r = await verifyQuote("c", "held, in effect, that the old over-bearing rule", [a, b], { punctuationTolerance: true });
    expect(r.verdict).toBe("HOLD");
  });
  test("두 출처 모두 부호만 다르면(정확 일치 0곳) 통과시키지 않는다", async () => {
    const { verifyQuote } = await import("../src/application/verifyQuote");
    const r = await verifyQuote("c", "held in effect that the overbearing rule", [a, mk("held in effect that the over-bearing rule applies")], { punctuationTolerance: true });
    expect(r.verdict).toBe("HOLD");
  });
});
