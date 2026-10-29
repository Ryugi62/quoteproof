import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
// SPEC §12: 테스트넷 개인키는 ~/.config/quoteproof 밖(레포·로그·영상)에 없다.
const keyFile = `${process.env.HOME}/.config/quoteproof/sepolia.env`;
const root = new URL("../", import.meta.url).pathname;
test.skipIf(!existsSync(keyFile))("레포 추적 파일·증거 로그·영상 자막에 테스트넷 개인키 값이 없다", () => {
  const key = readFileSync(keyFile, "utf8").match(/=([0-9a-fA-Fx]+)/)![1].replace(/^0x/, "").toLowerCase();
  expect(key.length).toBe(64);
  const files = spawnSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: root, encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  const hits: string[] = [];
  for (const f of files) {
    if (/\.(png|mp4|lock)$/.test(f)) continue;
    try { if (readFileSync(root + f, "latin1").toLowerCase().includes(key)) hits.push(f); } catch { /* 지워진 추적 파일 */ }
  }
  expect(hits).toEqual([]);
});
