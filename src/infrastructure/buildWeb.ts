// 웹 데모 묶음 생성: bun run src/infrastructure/buildWeb.ts → web/opinions.json + web/app.js
import { mkdirSync, writeFileSync } from "node:fs";
import { ALL_CASES } from "./cases";
import { fixtureFetcher } from "./fixtureFetcher";
import { capSource, liiSource } from "../adapters/sources";
import type { Bundle } from "../application/webCheck";

/** 두 출처 본문이 모두 있는 판결만 묶는다(CLI에서 INSUFFICIENT_SOURCES 가 되는 4건은 제외). */
export async function buildBundle(): Promise<Bundle> {
  const srcs = [capSource(fixtureFetcher), liiSource(fixtureFetcher)];
  const out: Bundle = [];
  for (const c of ALL_CASES) {
    const sources = [];
    for (const s of srcs) {
      const text = await s.readOpinion(c.cite);
      if (text != null) sources.push({ id: s.id, text, url: s.urlFor?.(c.cite) ?? undefined });
    }
    if (sources.length === srcs.length) out.push({ cite: c.cite, name: c.name, sources });
  }
  return out;
}

if (import.meta.main) {
  const root = new URL("../../web/", import.meta.url).pathname;
  mkdirSync(root, { recursive: true });
  const bundle = await buildBundle();
  writeFileSync(root + "opinions.json", JSON.stringify(bundle));
  const r = await Bun.build({ entrypoints: [new URL("./webEntry.ts", import.meta.url).pathname], outdir: root, naming: "app.js", target: "browser", minify: true });
  if (!r.success) { console.error(r.logs.join("\n")); process.exit(1); }
  console.log(`web/: ${bundle.length} opinions bundled, app.js built`);
}
