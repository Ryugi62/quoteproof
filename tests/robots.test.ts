// SPEC §14: robots.txt 준수. 원문 사본(docs/evidence)을 그대로 읽어 시험한다.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseRobots, isAllowed } from "../src/adapters/robots";
import { politeFetcher, type RawGet } from "../src/infrastructure/politeFetcher";

const read = (n: string) => readFileSync(new URL(`../docs/evidence/${n}`, import.meta.url).pathname, "utf8");
const LII = read("lii-robots-2026-10-30.txt");
const CAP = read("cap-robots-2026-10-30.txt");

test("LII robots.txt 원문: Crawl-delay 10초, 본문 경로 /supremecourt/text/는 허용, /admin/ 은 금지", () => {
  const r = parseRobots(LII);
  expect(r.crawlDelaySec).toBe(10);
  expect(isAllowed(r, "/supremecourt/text/372/335")).toBe(true);
  expect(isAllowed(r, "/admin/config")).toBe(false);
  expect(isAllowed(r, "/misc/a.css")).toBe(true);   // Allow가 더 길다
});
test("CAP robots.txt 원문: Disallow: / (전부 금지), Crawl-delay 없음", () => {
  const r = parseRobots(CAP);
  expect(r.crawlDelaySec).toBeNull();
  expect(isAllowed(r, "/us/372/cases/0335-01.json")).toBe(false);
});
test("User-agent: * 묶음만 읽는다(다른 봇 묶음의 Crawl-delay는 무시)", () => {
  const r = parseRobots("User-agent: BadBot\nCrawl-delay: 99\nDisallow: /\n\nUser-agent: *\nCrawl-delay: 3\n");
  expect(r.crawlDelaySec).toBe(3); expect(r.disallow).toEqual([]);
});

// ---- 지연 시험: 시계와 sleep을 주입한다 ----
function rig(robots: Record<string, string | null>, mode: "strict" | "user-initiated" = "user-initiated") {
  let t = 0; const log: { url: string; at: number }[] = []; const notes: string[] = [];
  const get: RawGet = async (url) => {
    log.push({ url, at: t });
    const u = new URL(url);
    if (u.pathname === "/robots.txt") return robots[u.host] ?? null;
    return `body of ${url}`;
  };
  const f = politeFetcher({ get, now: () => t, sleep: async (ms) => { t += ms; }, mode, say: (m) => notes.push(m), fallbackDelaySec: { "www.law.cornell.edu": 10 } });
  return { f, log, notes, time: () => t };
}

test("같은 호스트 두 URL: 두 번째 요청은 앞 요청 뒤 Crawl-delay(10초) 이상", async () => {
  const { f, log } = rig({ "www.law.cornell.edu": LII });
  await f("https://www.law.cornell.edu/supremecourt/text/372/335");
  await f("https://www.law.cornell.edu/supremecourt/text/496/384");
  const docs = log.filter((l) => !l.url.endsWith("/robots.txt"));
  expect(docs[1].at - docs[0].at).toBeGreaterThanOrEqual(10_000);
  // robots.txt 읽기도 요청 1건으로 세어 그 뒤에도 10초를 쉰다(보수적)
  const all = log.map((l) => l.at);
  for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1]).toBeGreaterThanOrEqual(10_000);
});
test("다른 호스트는 서로 기다리지 않는다", async () => {
  const { f, log } = rig({ "www.law.cornell.edu": LII, "example.org": "User-agent: *\nCrawl-delay: 0\n" });
  await f("https://www.law.cornell.edu/supremecourt/text/372/335");
  const t1 = log[log.length - 1].at;
  await f("https://example.org/a");
  const ex = log.filter((l) => l.url.includes("example.org"));
  expect(ex[0].at).toBe(t1);   // 시간이 흐르지 않음
});
test("robots.txt를 못 읽으면 LII는 기본 10초를 쓴다", async () => {
  const { f, log, notes } = rig({ "www.law.cornell.edu": null });
  await f("https://www.law.cornell.edu/supremecourt/text/1/1");
  await f("https://www.law.cornell.edu/supremecourt/text/2/2");
  const docs = log.filter((l) => !l.url.endsWith("/robots.txt"));
  expect(docs[1].at - docs[0].at).toBeGreaterThanOrEqual(10_000);
  expect(notes.join("\n")).toContain("robots.txt unreadable");
});
test("strict 모드: Disallow 경로는 요청 0건(null), user-initiated 모드: 안내 1줄을 내고 읽는다", async () => {
  const s = rig({ "static.case.law": CAP }, "strict");
  expect(await s.f("https://static.case.law/us/372/cases/0335-01.json")).toBeNull();
  expect(s.log.filter((l) => !l.url.endsWith("/robots.txt")).length).toBe(0);
  const u = rig({ "static.case.law": CAP }, "user-initiated");
  expect(await u.f("https://static.case.law/us/372/cases/0335-01.json")).toContain("body of");
  await u.f("https://static.case.law/us/496/cases/0384-01.json");
  expect(u.notes.filter((n) => n.includes("Disallow")).length).toBe(1);   // 호스트당 한 번만 알린다
});
test("robots.txt는 호스트당 한 번만 읽는다", async () => {
  const { f, log } = rig({ "www.law.cornell.edu": LII });
  await f("https://www.law.cornell.edu/supremecourt/text/1/1"); await f("https://www.law.cornell.edu/supremecourt/text/2/2"); await f("https://www.law.cornell.edu/supremecourt/text/3/3");
  expect(log.filter((l) => l.url.endsWith("/robots.txt")).length).toBe(1);
});
test("동시에 불러도 같은 호스트 요청은 줄을 서서 Crawl-delay 간격으로 나간다(로컬 합의 4노드)", async () => {
  const { f, log } = rig({ "www.law.cornell.edu": LII });
  await Promise.all([1, 2, 3, 4].map((i) => f(`https://www.law.cornell.edu/supremecourt/text/${i}/${i}`)));
  const all = log.map((l) => l.at);
  expect(all.length).toBe(5);   // robots.txt 1 + 문서 4
  for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1]).toBeGreaterThanOrEqual(10_000);
});
