import { expect, test } from "bun:test";
import { checkReadme, type ReadmeFacts } from "../tools/readmeCheck";
const facts: ReadmeFacts = {
  rootTests: 53, creTests: 10,
  fileExists: (p) => p !== "docs/evidence/missing.log",
  genuineHash: "b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198",
  userLogLine: "Consensus result: PASS  hash=b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198",
  briefSummary: "Summary: 5 quotes found · 2 PASS · 2 HOLD · 1 not checked (no supported citation) · brief text stayed local",
  videoSeconds: 160,
};
const good = `bun test  # 53 tests
cre 10 tests
see docs/evidence/ok.log and demo/quoteproof-demo.mp4 (under 3 min)
b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198
[USER LOG] Consensus result: PASS  hash=b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198
Summary: 5 quotes found · 2 PASS · 2 HOLD · 1 not checked (no supported citation) · brief text stayed local`;
test("모든 주장이 맞으면 어긋남 0", () => { expect(checkReadme(good, facts)).toEqual([]); });
test("테스트 수·없는 증거 경로·해시·요약 줄·영상 길이가 어긋나면 각각 잡는다", () => {
  const bad = good.replace("53 tests", "45 tests").replace("10 tests", "9 tests").replace("docs/evidence/ok.log", "docs/evidence/missing.log")
    .replace("b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198\n[USER", "deadbeef\n[USER").replace("2 PASS", "3 PASS");
  const out = checkReadme(bad, { ...facts, videoSeconds: 200 });
  expect(out.length).toBeGreaterThanOrEqual(5);
  expect(out.join("\n")).toContain("53 tests"); expect(out.join("\n")).toContain("10 tests"); expect(out.join("\n")).toContain("missing.log");
  expect(out.join("\n")).toContain("Summary"); expect(out.join("\n")).toContain("under 3 min");
});

test("v4 체인 사실(수신 주소·forwarder·거래 해시)이 README에 없으면 잡는다", () => {
  const f = { ...facts, chainFacts: [{ label: "receiver", value: "0x65faa0e6f6cd105997c93f9d3b72872e8765bbe8" }, { label: "tx", value: "0x1cf907540bd6d595beae2ca7daeeda7504b38b1ed7469a66202c6c225a41b14f" }] };
  expect(checkReadme(good, f).length).toBe(2);
  expect(checkReadme(good + "\n0x65FAA0E6F6CD105997C93F9D3B72872E8765BBE8 0x1cf907540bd6d595beae2ca7daeeda7504b38b1ed7469a66202c6c225a41b14f", f)).toEqual([]);
});
