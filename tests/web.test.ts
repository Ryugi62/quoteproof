import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { checkBundled, type Bundle } from "../src/application/webCheck";
import { verifyQuote } from "../src/application/verifyQuote";
import { capSource, liiSource } from "../src/adapters/sources";
import { fixtureFetcher } from "../src/infrastructure/fixtureFetcher";
import { buildBundle } from "../src/infrastructure/buildWeb";

// SPEC §18: 웹 데모의 핵심 규칙 = CLI와 같은 verifyFromTexts. 같은 입력 → 같은 영수증 해시.
const clock = () => "2026-10-31T00:00:00.000Z";
const cases: [string, string][] = [
  ["372 U.S. 335", "any person haled into court, who is too poor to hire a lawyer, cannot be assured a fair trial unless counsel is provided for him"],
  ["372 U.S. 335", "any person haled into court, who is too poor to hire a lawyer, can be assured a fair trial unless counsel is provided for him"],
  ["496 U.S. 384", "as a bar to the courthouse door"],
  ["496 U.S. 384", "Rule 38 gives appellate courts ample authority to award expenses"],
  ["5 U.S. 137", "It is emphatically the province and duty of the judicial department to say what the law is"],
];

test("웹 데모 규칙 일치: checkBundled 해시 = CLI(verifyQuote, 고정 fixtures) 해시", async () => {
  const bundle = await buildBundle();
  const cli = [capSource(fixtureFetcher), liiSource(fixtureFetcher)];
  for (const [cite, q] of cases) {
    const web = checkBundled(bundle, cite, q, { clock });
    const ref = await verifyQuote(cite, q, cli, { clock });
    expect(web.kind).toBe("receipt");
    if (web.kind !== "receipt") continue;
    expect(web.receipt.receiptHash).toBe(ref.receiptHash);
    expect(web.receipt.verdict).toBe(ref.verdict);
  }
});

test("묶음에 없는 인용은 PASS가 아니라 NOT_BUNDLED(CLI 안내)", () => {
  const bundle: Bundle = [];
  const r = checkBundled(bundle, "999 U.S. 1", "some quoted words here", { clock });
  expect(r.kind).toBe("not_bundled");
});

test("web/ 산출물: index.html 첫 줄 문구·입력 id·다운로드 없이 열리는 정적 파일", () => {
  const p = (f: string) => new URL(`../web/${f}`, import.meta.url).pathname;
  expect(existsSync(p("index.html"))).toBe(true);
  const html = readFileSync(p("index.html"), "utf8");
  expect(html).toContain("bundled opinion texts — full live check: CLI");
  for (const id of ['id="cite"', 'id="quote"', 'id="check"', 'id="result"']) expect(html).toContain(id);
  expect(html).toContain("string match only");
  expect(existsSync(p("app.js"))).toBe(true);
  expect(existsSync(p("opinions.json"))).toBe(true);
});
