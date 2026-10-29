// README의 숫자·경로·최신 실행 주장을 실측 사실과 대조한다(순수 함수). CLI는 tools/check_readme.ts.
export interface ReadmeFacts {
  rootTests: number; creTests: number;
  fileExists: (relPath: string) => boolean;
  genuineHash: string;      // 최신 CRE 시뮬 로그(genuine)의 receiptHash
  userLogLine: string;      // 최신 CRE 시뮬 로그(genuine)의 「Consensus result」 USER LOG 줄 본문
  briefSummary: string;     // 최신 verify-brief 실행 로그의 Summary 줄
  videoSeconds: number | null;
  /** v4: README가 적어야 하는 체인 사실 — config.json의 수신 주소·고정한 forwarder·v4 로그의 거래 해시들 */
  chainFacts?: { label: string; value: string }[];
}
export function checkReadme(readme: string, f: ReadmeFacts): string[] {
  const out: string[] = [];
  if (!readme.includes(`${f.rootTests} tests`)) out.push(`README does not say "${f.rootTests} tests" (actual root bun test count)`);
  if (!readme.includes(`${f.creTests} tests`)) out.push(`README does not say "${f.creTests} tests" (actual cre workflow bun test count)`);
  const paths = new Set([...readme.matchAll(/\b((?:docs\/evidence|demo|fixtures|tools|cre)\/[A-Za-z0-9_.\-/]*[A-Za-z0-9_])/g)].map((m) => m[1]));
  for (const p of paths) if (!f.fileExists(p) && !p.endsWith("/")) out.push(`README names ${p} but it does not exist`);
  if (!readme.includes(f.genuineHash)) out.push(`README lacks the latest genuine receipt hash ${f.genuineHash.slice(0, 12)}…`);
  if (!readme.includes(f.userLogLine)) out.push(`README lacks the latest USER LOG line "${f.userLogLine.slice(0, 40)}…"`);
  if (!readme.includes(f.briefSummary)) out.push(`README lacks the latest verify-brief Summary line`);
  if (readme.includes("under 3 min") && f.videoSeconds != null && f.videoSeconds >= 180) out.push(`README says "under 3 min" but the video is ${f.videoSeconds.toFixed(1)}s`);
  for (const c of f.chainFacts ?? []) if (!readme.toLowerCase().includes(c.value.toLowerCase())) out.push(`README lacks ${c.label} ${c.value.slice(0, 14)}…`);
  return out;
}
