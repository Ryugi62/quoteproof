// CRE SDK 테스트 런타임에서 실제 워크플로 코드(fetchBoth → HTTPClient → 노드 모드 → consensusIdenticalAggregation)를 실행한다.
// cre workflow simulate(계정 로그인 필요)가 아니다. 출처 응답만 고정 fixtures로 대신한다.
import { expect } from "bun:test";
import { consensusIdenticalAggregation } from "@chainlink/cre-sdk";
import { HttpActionsMock, newTestRuntime, test } from "@chainlink/cre-sdk/test";
import { readFileSync } from "node:fs";
import { fetchBoth } from "./main";
import { ALL_CASES as CASES, capUrl, liiUrl } from "../../src/infrastructure/cases";

const fx = new URL("../../fixtures/raw/", import.meta.url).pathname;
const body = (url: string): string | null => {
  for (const c of CASES) {
    if (url === capUrl(c)) return readFileSync(`${fx}cap/${c.slug}.json`, "utf8");
    if (url === liiUrl(c) && c.lii) return `<main id="main"><p>${readFileSync(`${fx}lii-text/${c.slug}.txt`, "utf8").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></main>`;
  }
  return null;
};
const run = (citation: string, quote: string) => {
  const http = HttpActionsMock.testInstance();
  const urls: string[] = [];
  http.sendRequest = (req: any) => {
    urls.push(req.url);
    const b = body(req.url);
    return b == null ? { statusCode: 404, headers: {}, body: "" } : { statusCode: 200, headers: {}, body: Buffer.from(b).toString("base64") };
  };
  const rt = newTestRuntime(null, {}, { minSources: 2 });
  const obs = rt.runInNodeMode(fetchBoth, consensusIdenticalAggregation())({ citation, quote }).result();
  return { obs, urls };
};

test("두 출처를 모두 읽고 진짜 인용은 PASS", () => {
  const { obs, urls } = run("372 U.S. 335", "any person haled into court, who is too poor to hire a lawyer, cannot be assured a fair trial unless counsel is provided for him");
  console.log("SDK-RUNTIME genuine:", JSON.stringify(obs), urls.join(" , "));
  expect(urls.length).toBe(2); expect(obs.verdict).toBe("PASS"); expect(obs.sourceSummary).toContain("cap:found"); expect(obs.sourceSummary).toContain("lii:found");
});
test("변조 인용은 HOLD", () => {
  const { obs } = run("372 U.S. 335", "any person haled into court, who is too poor to hire a lawyer, can still be assured a fair trial even if counsel is not provided for him");
  console.log("SDK-RUNTIME altered:", JSON.stringify(obs));
  expect(obs.verdict).toBe("HOLD");
});
test("영수증 해시가 로컬 구현과 같다(같은 코드)", async () => {
  const { obs } = run("372 U.S. 335", "any person haled into court, who is too poor to hire a lawyer, cannot be assured a fair trial unless counsel is provided for him");
  expect(obs.receiptHash).toBe("b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198");
});
