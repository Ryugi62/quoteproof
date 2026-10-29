// bun run tools/check_readme.ts — README 주장 ↔ 실측 대조(결과물 게이트 repo_checks가 부른다). 어긋나면 exit 1.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { checkReadme } from "./readmeCheck";

const root = new URL("../", import.meta.url).pathname;
const read = (p: string) => readFileSync(root + p, "utf8");
const count = (cwd: string) => {
  const r = spawnSync("bun", ["test"], { cwd, encoding: "utf8" });
  const m = (r.stdout + r.stderr).match(/Ran (\d+) tests/);
  if (r.status !== 0 || !m) { console.error(`bun test failed in ${cwd}\n${(r.stdout + r.stderr).slice(-400)}`); process.exit(1); }
  return Number(m[1]);
};
const latest = (re: RegExp) => readdirSync(root + "docs/evidence").filter((f) => re.test(f)).sort().pop()!;
const sim = read("docs/evidence/" + latest(/^cre-simulate-v3-english-genuine-.*\.log$/));
const hash = sim.match(/"receiptHash\\":\\"([0-9a-f]{64})/)?.[1] ?? "";
const userLogLine = (sim.match(/\[USER LOG\] (Consensus result: .*)$/m) ?? [, ""])[1]!;
const brief = read("docs/evidence/" + latest(/^verify-brief-.*\.log$/));
const briefSummary = (brief.match(/^Summary: .*$/m) ?? [""])[0];
let videoSeconds: number | null = null;
const pr = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", root + "demo/quoteproof-demo.mp4"], { encoding: "utf8" });
if (pr.status === 0) videoSeconds = Number(pr.stdout.trim());

const cfg = JSON.parse(read("cre/workflow/config.json"));
const chainLog = read("docs/evidence/chain-write-sepolia-v4-2026-10-30.log");
const chainFacts = [
  { label: "receiver address in cre/workflow/config.json", value: cfg.evm.receiverAddress as string },
  { label: "forwarder pinned by the receiver (v4 log)", value: chainLog.match(/forwarder \(constructor arg\) (0x[0-9a-fA-F]{40})/)?.[1] ?? "MISSING-forwarder-in-log" },
  ...[...chainLog.matchAll(/^tx (0x[0-9a-f]{64})$/gm)].map((m) => ({ label: "v4 broadcast tx", value: m[1] })),
];
const bad = checkReadme(read("README.md"), {
  rootTests: count(root), creTests: count(root + "cre/workflow"),
  fileExists: (p) => existsSync(root + p), genuineHash: hash, userLogLine, briefSummary, videoSeconds, chainFacts,
});
if (bad.length) { console.error("README check FAILED:\n- " + bad.join("\n- ")); process.exit(1); }
console.log(`README check OK (test counts verified, evidence paths exist, hash and USER LOG line match the latest simulate log, video ${videoSeconds?.toFixed(1) ?? "n/a"}s)`);
