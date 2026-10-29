import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
const layers = ["domain", "application", "adapters", "infrastructure"];
const rank = Object.fromEntries(layers.map((l, i) => [l, i]));
test("역방향 import 0건 + domain은 node:·외부 패키지를 모른다", () => {
  const bad: string[] = [];
  for (const layer of layers) {
    for (const f of readdirSync(new URL(`../src/${layer}`, import.meta.url).pathname)) {
      const text = readFileSync(new URL(`../src/${layer}/${f}`, import.meta.url).pathname, "utf8");
      for (const m of text.matchAll(/from\s+["']([^"']+)["']/g)) {
        const spec = m[1];
        const up = spec.match(/\.\.\/(domain|application|adapters|infrastructure)\//);
        if (up && rank[up[1]] > rank[layer]) bad.push(`${layer}/${f} -> ${spec}`);
        if (layer === "domain" && (spec.startsWith("node:") || (!spec.startsWith(".")))) bad.push(`domain/${f} -> ${spec}`);
      }
    }
  }
  expect(bad).toEqual([]);
});
