import type { Fetcher } from "../adapters/sources";
/** 라이브 읽기가 네트워크 오류로 실패하면 고정 fixtures로 바꾼다. 바꾸는 순간 첫 줄 안내를 한 번 낸다. */
export function withFixtureFallback(live: Fetcher, fixture: Fetcher, say: (m: string) => void): Fetcher {
  let offline = false;
  return async (url) => {
    if (!offline) {
      try { return await live(url); } catch { offline = true; say("OFFLINE: network failed -> pinned fixtures mode (reads only the 24 saved opinions; NOT the live sources)"); }
    }
    return fixture(url);
  };
}
