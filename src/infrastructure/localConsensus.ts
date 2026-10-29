// CRE 시뮬레이션을 못 돌릴 때의 대체: 같은 코드(verifyFromTexts)를 노드 N개가 각자 실제 네트워크로 출처 2곳을 읽고,
// CRE와 같은 규칙(정확히 같은 관측값이 쿼럼 이상)으로 합의한다. 이것은 cre simulate가 아니다 — 로그에도 그렇게 적는다.
import { verifyFromTexts } from "../application/verifyQuote";
import { identicalConsensus, toObservation } from "../application/consensus";
import { capText, liiText, parseUsCite, capUrl, liiUrl } from "../adapters/sources";
import { makePoliteGet } from "./liveFetcher";

// 4개 노드가 한꺼번에 불러도 같은 호스트(LII)로 가는 요청은 robots.txt Crawl-delay(10초) 간격으로 줄을 선다(SPEC §14).
const polite = makePoliteGet((m) => console.log(`  [${m}]`), "user-initiated");
async function nodeRun(node: number, citation: string, quote: string) {
  const c = parseUsCite(citation)!;
  const inputs: { id: string; text: string }[] = [];
  for (const [id, url, parse] of [["cap", capUrl(c.vol, c.page), capText], ["lii", liiUrl(c.vol, c.page), liiText]] as const) {
    const t0 = Date.now();
    const body = await polite(url);
    console.log(`  node${node} GET ${url} -> ${body == null ? "not read" : "200 " + body.length + "B"} ${Date.now() - t0}ms`);
    const text = body ? parse(body) : null; if (text) inputs.push({ id, text });
  }
  return toObservation(verifyFromTexts(citation, quote, inputs, { clock: () => "-" }));
}

const [citation, quote, nodesArg] = process.argv.slice(2);
const N = Number(nodesArg ?? 4);
console.log(`[local multi-node consensus -- NOT cre simulate] ${new Date().toISOString()} ${N} nodes · ${citation}`);
const obs = await Promise.all(Array.from({ length: N }, (_, i) => nodeRun(i + 1, citation, quote)));
obs.forEach((o, i) => console.log(`node${i + 1}:`, JSON.stringify(o)));
const c = identicalConsensus(obs);
console.log("consensus:", JSON.stringify(c));
process.exit(c.reached ? 0 : 1);
