// QuoteProof CRE 워크플로 — 모든 노드가 같은 코드로 출처 2곳(CAP + LII)을 직접 읽고 판정한다.
// 노드마다 출처를 나누지 않는다. 합의 대상은 「판정 + 영수증 해시」뿐이다(원문 서면·본문은 체인에 가지 않는다).
// v2: 합의된 판정·해시를 Sepolia 수신 컨트랙트로 EVM writeReport 한다(SPEC §8). --broadcast 없이는 모의 실행이다.
import { HTTPCapability, HTTPClient, EVMClient, getNetwork, consensusIdenticalAggregation, decodeJson, handler, ok, prepareReportRequest, Runner, type HTTPPayload, type NodeRuntime, type Runtime } from "@chainlink/cre-sdk";
import { verifyFromTexts } from "../../src/application/verifyQuote";
import { toObservation, type Observation } from "../../src/application/consensus";
import { encodeOnchainReport } from "./onchain";
import { capText, liiText, parseUsCite, capUrl, liiUrl } from "../../src/adapters/sources";

type Config = { minSources: number; evm: { chainSelectorName: string; receiverAddress: string; gasLimit: string } };
type Req = { citation: string; quote: string };

export const fetchBoth = (nodeRuntime: NodeRuntime<Config>, req: Req): Observation => {
  const c = parseUsCite(req.citation);
  if (!c) return { verdict: "HOLD", reasons: "INSUFFICIENT_SOURCES", receiptHash: "", sourceSummary: "unsupported-citation" };
  const http = new HTTPClient();
  const inputs: { id: string; text: string; url: string }[] = [];
  for (const [id, url, parse] of [["cap", capUrl(c.vol, c.page), capText], ["lii", liiUrl(c.vol, c.page), liiText]] as const) {
    try {
      const resp = http.sendRequest(nodeRuntime, { url, method: "GET" }).result();
      if (!ok(resp)) continue;
      const text = parse(new TextDecoder().decode(resp.body));
      if (text) inputs.push({ id, text, url });
    } catch { /* 못 읽은 출처는 목록에서 빠진다 → INSUFFICIENT_SOURCES */ }
  }
  // 시각은 노드마다 다르므로 영수증 해시에서 제외돼 있다(checkedAt 고정값 사용)
  const r = verifyFromTexts(req.citation, req.quote, inputs, { minSources: nodeRuntime.config.minSources, clock: () => "-" });
  return toObservation(r);
};

export const onHttp = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  const req = decodeJson(payload.input) as Req;
  runtime.log(`QuoteProof request: ${req.citation} / quote ${req.quote.length} chars`);
  const obs = runtime.runInNodeMode(fetchBoth, consensusIdenticalAggregation<Observation>())(req).result();
  runtime.log(`Consensus result: ${obs.verdict} ${obs.reasons} hash=${obs.receiptHash}`);
  runtime.log(`Per source: ${obs.sourceSummary}`);
  const chain = writeOnchain(runtime, obs);
  return JSON.stringify({ verdict: obs.verdict, reasons: obs.reasons, receiptHash: obs.receiptHash, chain });
};

/** 합의된 판정·해시를 수신 컨트랙트로 보고한다. 실패해도 판정은 돌려준다(체인 기록은 판정을 바꾸지 않는다). */
export const writeOnchain = (runtime: Runtime<Config>, obs: Observation): string => {
  const enc = encodeOnchainReport(obs);
  if (!enc.ok) { runtime.log(`Chain write skipped: ${enc.why}`); return "skipped"; }
  const { chainSelectorName, receiverAddress, gasLimit } = runtime.config.evm;
  const network = getNetwork({ chainFamily: "evm", chainSelectorName, isTestnet: true });
  if (!network) { runtime.log(`Chain write failed: network ${chainSelectorName} not found`); return "no-network"; }
  const evm = new EVMClient(network.chainSelector.selector);
  const report = runtime.report(prepareReportRequest(enc.hex)).result();
  const reply = evm.writeReport(runtime, { receiver: receiverAddress, report, gasConfig: { gasLimit } }).result();
  const status = ["FATAL", "REVERTED", "SUCCESS"][reply.txStatus] ?? String(reply.txStatus);
  const txHash = reply.txHash && reply.txHash.length ? `0x${Buffer.from(reply.txHash).toString("hex")}` : "none (dry run: no transaction sent)";
  runtime.log(`writeReport reply: TX_STATUS_${status} txHash=${txHash} err=${reply.errorMessage ?? "-"}`);
  return `TX_STATUS_${status}`;
};

const initWorkflow = () => [handler(new HTTPCapability().trigger({}), onHttp)];
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
