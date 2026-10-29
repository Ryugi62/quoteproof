import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
// README 수치표는 fixtures/eval-results.json(평가 러너 출력)과 일치해야 한다 — 손으로 쓴 숫자 불일치 0.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url).pathname, "utf8");
const pct = (k: number, n: number) => `${k}/${n} = ${((k / n) * 100).toFixed(1)}%`;
test("README 수치표 = eval-results.json (오탐률·누락률, 개발셋·홀드아웃·합산)", () => {
  const readme = read("README.md");
  const ev = JSON.parse(read("fixtures/eval-results.json"));
  const miss: string[] = [];
  const pooled: Record<string, { k: number; n: number }> = {};
  let fpK = 0, fpN = 0;
  for (const set of ["testset.json", "testset-holdout.json"]) {
    for (const cfg of ["출처 2곳 합의·엄격(기본)", "출처 2곳 합의·부호 허용(사후 정책)"]) {
      const r = ev[set].results[cfg];
      const s = pct(r.falseHold.k, r.falseHold.n);
      if (!readme.includes(s)) miss.push(`${set}/${cfg}: ${s}`);
      pooled[cfg] = { k: (pooled[cfg]?.k ?? 0) + r.falseHold.k, n: (pooled[cfg]?.n ?? 0) + r.falseHold.n };
      if (cfg.includes("엄격")) { fpK += r.falsePass.k; fpN += r.falsePass.n; }
    }
  }
  for (const [cfg, v] of Object.entries(pooled)) if (!readme.includes(pct(v.k, v.n))) miss.push(`합산 ${cfg}: ${pct(v.k, v.n)}`);
  if (!readme.includes(pct(fpK, fpN))) miss.push(`합산 누락: ${pct(fpK, fpN)}`);
  expect(miss).toEqual([]);
});
