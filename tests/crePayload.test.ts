// SPEC §16: verify-brief → CRE 페이로드 / 시뮬레이션 연결
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { verifyBrief } from "../src/application/verifyBrief";
import { buildCrePayloads, parseCreLog, bridgeToCre, type CreRunner } from "../src/application/creBridge";
import { capSource, liiSource } from "../src/adapters/sources";
import { fixtureFetcher } from "../src/infrastructure/fixtureFetcher";

const brief = readFileSync(new URL("../fixtures/brief-example-allen.txt", import.meta.url).pathname, "utf8");
const src = [capSource(fixtureFetcher), liiSource(fixtureFetcher)];
const report = await verifyBrief(brief, src, { clock: () => "2026-10-30T00:00:00Z" });

test("READY 행마다 {citation, quote} 페이로드 1개, NOT_CHECKED는 index에만 사유와 함께", () => {
  const b = buildCrePayloads(report);
  expect(b.payloads.length).toBe(4);
  expect(b.payloads.map((p) => p.file)).toEqual(["payload-01.json", "payload-02.json", "payload-03.json", "payload-04.json"]);
  for (const p of b.payloads) expect(Object.keys(p.body).sort()).toEqual(["citation", "quote"]);
  const skipped = b.index.filter((x) => x.payload == null);
  expect(skipped.length).toBe(1);
  expect(skipped[0].notChecked).toBe("UNSUPPORTED_REPORTER");
  expect(b.index.filter((x) => x.payload).every((x) => /^[0-9a-f]{64}$/.test(x.localReceiptHash!))).toBe(true);
});
test("프라이버시: 페이로드 본문에는 그 Quote와 인용뿐 — 서면의 다른 문장·제목·NOT_CHECKED 행 낱말이 없다", () => {
  const b = buildCrePayloads(report);
  const all = JSON.stringify(b.payloads.map((p) => p.body));
  for (const w of ["PLAINTIFF", "Opposition", "sanctions standard", "Defendant", "Ninth Circuit", "a party must show prejudice", "good cause"]) expect(all).not.toContain(w);
  for (const p of b.payloads) expect(brief.replace(/\s+/g, " ")).toContain(p.body.quote.slice(0, 40));
});
test("기존 cre/payload-genuine.json과 같은 모양", () => {
  const g = JSON.parse(readFileSync(new URL("../cre/payload-genuine.json", import.meta.url).pathname, "utf8"));
  expect(Object.keys(g).sort()).toEqual(["citation", "quote"]);
});

const LOG = `[USER LOG] QuoteProof request: 372 U.S. 335 / quote 128 chars
2026-10-30T06:22:41Z [USER LOG] Consensus result: PASS  hash=b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198
2026-10-30T06:22:41Z [USER LOG] writeReport reply: TX_STATUS_SUCCESS txHash=none (dry run: no transaction sent) err=-`;
test("CRE 로그에서 합의 판정·해시·체인 줄을 뽑는다", () => {
  const r = parseCreLog(LOG);
  expect(r).toMatchObject({ verdict: "PASS", reasons: "", hash: "b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198" });
  expect(r!.chainLine).toContain("TX_STATUS_SUCCESS");
  expect(parseCreLog("nothing")).toBeNull();
});
test("bridgeToCre: 로컬 영수증 해시와 CRE 합의 해시가 같으면 match, 다르면 mismatch", async () => {
  const b = buildCrePayloads(report);
  const row = b.index.find((x) => x.payload === "payload-04.json")!;   // Gideon PASS
  const ok: CreRunner = async () => ({ code: 0, out: LOG.replace(/b5fc1c1a[0-9a-f]+/, row.localReceiptHash!) });
  const r1 = await bridgeToCre(b, 4, ok);
  expect(r1.ok).toBe(true); expect(r1.hashMatch).toBe(true); expect(r1.lines.join("\n")).toContain("CRE consensus hash == local receipt hash");
  const bad: CreRunner = async () => ({ code: 0, out: LOG.replace(/hash=[0-9a-f]{64}/, "hash=" + "0".repeat(64)) });
  const r2 = await bridgeToCre(b, 4, bad);
  expect(r2.hashMatch).toBe(false); expect(r2.lines.join("\n")).toContain("MISMATCH");
});
test("bridgeToCre: cre가 실패하거나 없는 행 번호면 ok=false와 이유", async () => {
  const b = buildCrePayloads(report);
  const fail: CreRunner = async () => ({ code: 1, out: "boom" });
  expect((await bridgeToCre(b, 1, fail)).ok).toBe(false);
  const none = await bridgeToCre(b, 5, fail);   // 5번은 NOT_CHECKED
  expect(none.ok).toBe(false); expect(none.lines.join("\n")).toContain("NOT_CHECKED");
});
