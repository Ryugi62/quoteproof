import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
// 레드팀 ⑦: 공개 사례는 10건 이상 목록에 있어야 하고, 시험 못 한 건은 사유가 적혀 있어야 한다.
const pub = JSON.parse(readFileSync(new URL("../fixtures/public-cases.json", import.meta.url).pathname, "utf8"));
test("공개 사례 목록 ≥10건(시험 8 + 보류 사유 표기)", () => {
  expect(pub.cases.length + pub.deferred.length).toBeGreaterThanOrEqual(10);
});
test("보류 건마다 사건·귀속 판결·보류 사유가 있다", () => {
  for (const d of pub.deferred) {
    expect(d.dbCase.length).toBeGreaterThan(3); expect(d.attributedTo.length).toBeGreaterThan(3);
    expect(["NO_QUOTE_TEXT", "OUT_OF_SCOPE_LOWER_COURT"]).toContain(d.holdReason);
  }
});
test("README가 시험 건수와 보류 건수를 그대로 적는다", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url).pathname, "utf8");
  expect(readme).toContain(`${pub.cases.length} tested`);
  expect(readme).toContain(`${pub.deferred.length} listed but not testable`);
});
