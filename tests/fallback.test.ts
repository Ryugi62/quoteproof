import { expect, test } from "bun:test";
import { withFixtureFallback } from "../src/infrastructure/fallbackFetcher";
test("네트워크가 예외를 던지면 고정 fixtures로 바꾸고 안내를 한 번만 낸다", async () => {
  const notes: string[] = [];
  const f = withFixtureFallback(async () => { throw new Error("ENOTFOUND"); }, async (u) => `fx:${u}`, (m) => notes.push(m));
  expect(await f("a")).toBe("fx:a"); expect(await f("b")).toBe("fx:b");
  expect(notes.length).toBe(1); expect(notes[0]).toContain("pinned fixtures");
});
test("네트워크가 되면 그대로 쓴다(안내 없음)", async () => {
  const notes: string[] = [];
  const f = withFixtureFallback(async (u) => `live:${u}`, async () => "fx", (m) => notes.push(m));
  expect(await f("a")).toBe("live:a"); expect(notes).toEqual([]);
});
