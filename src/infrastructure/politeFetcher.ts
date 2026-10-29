// robots.txt 준수 읽기 — SPEC §14. 시계·sleep·GET은 주입한다(시험은 가짜 시계로 지연을 잰다).
import { isAllowed, parseRobots, type RobotsRules } from "../adapters/robots";
import type { Fetcher } from "../adapters/sources";

/** GET 한 번. 본문 글자를 돌려주고, 실패(비 200·네트워크 오류 아님)면 null. 네트워크 오류는 던진다. */
export type RawGet = (url: string) => Promise<string | null>;
export interface PoliteOptions {
  get: RawGet; now: () => number; sleep: (ms: number) => Promise<void>;
  /** strict: Disallow 경로는 요청하지 않는다. user-initiated: 사람이 부른 인용 1건당 GET 1회라서 요청하되 안내 1줄을 낸다(README Limits). Crawl-delay는 두 모드 모두 지킨다. */
  mode: "strict" | "user-initiated";
  say: (m: string) => void;
  /** robots.txt를 못 읽을 때 쓸 호스트별 지연(초). */
  fallbackDelaySec?: Record<string, number>;
}

export function politeFetcher(o: PoliteOptions): Fetcher {
  const hosts = new Map<string, { rules: RobotsRules | null; last: number | null; told: boolean }>();
  const queues = new Map<string, Promise<unknown>>();   // 호스트별 줄: 동시에 불려도 같은 호스트 요청은 한 번에 하나씩, 간격을 두고 나간다
  const wait = async (host: string, h: { last: number | null }, delaySec: number) => {
    if (h.last == null) return;
    const gap = o.now() - h.last, need = delaySec * 1000;
    if (gap < need) { o.say(`waiting ${((need - gap) / 1000).toFixed(1)}s before the next request to ${host} (robots.txt Crawl-delay ${delaySec}s)`); await o.sleep(need - gap); }
  };
  const one = async (url: string): Promise<string | null> => {
    const u = new URL(url);
    let h = hosts.get(u.host);
    if (!h) {
      h = { rules: null, last: null, told: false }; hosts.set(u.host, h);
      let txt: string | null;
      try { txt = await o.get(`${u.protocol}//${u.host}/robots.txt`); }
      catch (e) { hosts.delete(u.host); throw e; }   // 네트워크 오류는 그대로 올려 보낸다(호출자가 OFFLINE 폴백으로 바꾼다. 쓸데없이 쉬지 않는다)
      h.last = o.now();
      if (txt == null) o.say(`NOTE: ${u.host}/robots.txt unreadable; using ${o.fallbackDelaySec?.[u.host] ?? 0}s between requests`);
      else h.rules = parseRobots(txt);
    }
    const delay = h.rules?.crawlDelaySec ?? o.fallbackDelaySec?.[u.host] ?? 0;
    if (h.rules && !isAllowed(h.rules, u.pathname + u.search)) {
      if (o.mode === "strict") { o.say(`SKIPPED: ${u.host}/robots.txt disallows ${u.pathname} (strict mode, no request sent)`); return null; }
      if (!h.told) { h.told = true; o.say(`NOTE: ${u.host}/robots.txt has a Disallow rule for ${u.pathname} (aimed at crawlers); this run is user-initiated, one GET per cited opinion, no link following`); }
    }
    await wait(u.host, h, delay);
    try { return await o.get(url); } finally { h.last = o.now(); }
  };
  return (url) => {
    const host = new URL(url).host;
    const run = (queues.get(host) ?? Promise.resolve()).then(() => one(url), () => one(url));
    queues.set(host, run.catch(() => undefined));
    return run;
  };
}
