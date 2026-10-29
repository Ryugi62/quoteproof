// SPEC §11: 워크플로가 내는 사용자 로그 줄(runtime.log)과 로그에 실리는 문자열에는 한글이 없다.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
const src = (f: string) => readFileSync(new URL(f, import.meta.url).pathname, "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
test("main.ts·onchain.ts 코드(주석 제외)에 한글 문자열이 없다", () => {
  for (const f of ["./main.ts", "./onchain.ts"]) {
    const hits = stripComments(src(f)).split("\n").filter((l) => /[가-힣]/.test(l));
    expect(hits).toEqual([]);
  }
});
