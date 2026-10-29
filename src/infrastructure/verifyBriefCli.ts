// 준비서면 일괄 검사 CLI: bun run verify-brief <파일.txt|.md> [--cre-payload <디렉터리> [--cre-simulate <행 번호> [--cre-broadcast]]]  (SPEC §10, §16)
// 서면 원문은 이 프로세스 안에만 있다. 외부로 나가는 요청은 Citation에서 만든 출처 URL(GET)뿐이다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { buildCrePayloads, bridgeToCre, type CreRunner } from "../application/creBridge";
import { verifyBrief, formatBriefReport } from "../application/verifyBrief";
import { makeLiveFetcher } from "./liveFetcher";
import { capSource, liiSource, type Fetcher } from "../adapters/sources";

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const file = args[0];
const creDir = opt("--cre-payload"), creRow = opt("--cre-simulate");
if (!file || !/\.(txt|md)$/i.test(file) || (args.includes("--cre-payload") && !creDir) || (args.includes("--cre-simulate") && (!creDir || !creRow || !/^\d+$/.test(creRow)))) {
  console.error("usage: bun run verify-brief <brief.txt|brief.md> [--cre-payload <dir> [--cre-simulate <row #> [--cre-broadcast]]]"); process.exit(2);
}
const text = readFileSync(file, "utf8");

const live: Fetcher = makeLiveFetcher((m) => console.error(m));   // robots.txt 준수: LII Crawl-delay 10초(SPEC §14)
const cache = new Map<string, Promise<string | null>>();   // 같은 출처 URL은 한 번만 읽는다(LII robots 지연 존중)
const fetcher: Fetcher = (url) => { if (!cache.has(url)) cache.set(url, live(url)); return cache.get(url)!; };

const report = await verifyBrief(text, [capSource(fetcher), liiSource(fetcher)]);
console.log(formatBriefReport(report));
console.error(`read requests sent: ${cache.size} (source URLs built from citations only)`);

// --cre-payload: 판정된 Quote마다 CRE 워크플로 HTTP 페이로드(그 Quote와 인용뿐)를 쓴다. 옵션을 줘야만 파일이 생긴다(SPEC §16).
let creFailed = false;
if (creDir) {
  const bundle = buildCrePayloads(report);
  mkdirSync(creDir, { recursive: true });
  for (const p of bundle.payloads) writeFileSync(`${creDir}/${p.file}`, JSON.stringify(p.body) + "\n");
  writeFileSync(`${creDir}/index.json`, JSON.stringify(bundle.index, null, 2) + "\n");
  console.log(`CRE payloads: ${bundle.payloads.length} written to ${creDir}/ (each = one quote + its citation; ${bundle.index.length - bundle.payloads.length} not-checked row(s) listed in index.json only)`);
  if (creRow) {
    const creCwd = new URL("../../cre/", import.meta.url).pathname;
    const broadcast = args.includes("--cre-broadcast");
    const run: CreRunner = async (payloadFile) => {
      const cmd = ["workflow", "simulate", "workflow", "--target", "local-simulation", "--non-interactive", "--trigger-index", "0", "--http-payload", resolve(creDir, payloadFile), ...(broadcast ? ["--broadcast"] : [])];
      const r = spawnSync(process.env.CRE_BIN ?? "cre", cmd, { cwd: creCwd, encoding: "utf8", timeout: 180_000 });
      if (r.error) return { code: 127, out: String(r.error.message) };
      return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
    };
    const br = await bridgeToCre(bundle, Number(creRow), run);
    for (const l of br.lines) console.log(l);
    if (!br.ok) creFailed = true;
  }
}
process.exit(creFailed ? 2 : report.summary.hold > 0 ? 1 : 0);
