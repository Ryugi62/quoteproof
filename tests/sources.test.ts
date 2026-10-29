import { describe, expect, test } from "bun:test";
import { capSource, liiSource, parseUsCite } from "../src/adapters/sources";
import { htmlToText } from "../src/adapters/html";
import { fixtureFetcher } from "../src/infrastructure/fixtureFetcher";
import { verifyQuote } from "../src/application/verifyQuote";

describe("adapters", () => {
  test("U.S. 인용 파싱", () => { expect(parseUsCite("410 U.S. 113")).toEqual({ vol: 410, page: 113 }); expect(parseUsCite("123 F.3d 4")).toBeNull(); });
  test("HTML → 글자", () => { expect(htmlToText("<p>It&rsquo;s &amp; <b>so</b></p><script>x</script>").replace(/\s+/g, " ").trim()).toBe("It’s & so"); });
  test("고정 fixtures에서 두 출처 본문을 읽는다", async () => {
    const a = await capSource(fixtureFetcher).readOpinion("410 U.S. 113");
    const b = await liiSource(fixtureFetcher).readOpinion("410 U.S. 113");
    expect(a!.length).toBeGreaterThan(50000); expect(b!.length).toBeGreaterThan(50000);
    expect(a).toContain("present constitutional challenges to state criminal abortion legislation");
    expect(b).toContain("present constitutional challenges to state criminal abortion legislation");
  });
  test("LII에 본문이 없는 판결(Brown)은 못 읽음 → INSUFFICIENT_SOURCES", async () => {
    expect(await liiSource(fixtureFetcher).readOpinion("347 U.S. 483")).toBeNull();
    const r = await verifyQuote("347 U.S. 483", "separate educational facilities are inherently unequal", [capSource(fixtureFetcher), liiSource(fixtureFetcher)]);
    expect(r.verdict).toBe("HOLD"); expect(r.reasons).toContain("INSUFFICIENT_SOURCES");
  });
  test("실제 판결에서 두 출처 합의 PASS + 같은 입력 같은 해시", async () => {
    const srcs = [capSource(fixtureFetcher), liiSource(fixtureFetcher)];
    const q = "present constitutional challenges to state criminal abortion legislation";
    const r1 = await verifyQuote("410 U.S. 113", q, srcs, { clock: () => "a" });
    const r2 = await verifyQuote("410 U.S. 113", q, srcs, { clock: () => "b" });
    expect(r1.verdict).toBe("PASS"); expect(r1.sources.map((s) => s.id)).toEqual(["cap", "lii"]);
    expect(r1.receiptHash).toBe(r2.receiptHash);
  });
});
