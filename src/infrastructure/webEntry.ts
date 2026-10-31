// 브라우저 진입점(웹 데모). 판정은 application/webCheck → verifyFromTexts (CLI와 같은 함수). 여기는 화면만.
import { checkBundled, type Bundle } from "../application/webCheck";

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  const bundle = (await (await fetch("opinions.json")).json()) as Bundle;
  const sel = $("cite") as HTMLSelectElement;
  sel.innerHTML = bundle.map((b) => `<option value="${esc(b.cite)}">${esc(b.cite)} — ${esc(b.name)}</option>`).join("");
  const quote = $("quote") as HTMLTextAreaElement;
  const out = $("result");
  const run = () => {
    const q = quote.value.trim();
    if (q.split(/\s+/).filter(Boolean).length < 3) { out.innerHTML = `<p class="note">Type or paste a quotation of at least 3 words.</p>`; return; }
    const r = checkBundled(bundle, sel.value, q);
    if (r.kind === "not_bundled") { out.innerHTML = `<p class="hold">NOT_CHECKED: ${esc(r.citation)} is not in the bundled texts. Use the CLI for a live check.</p>`; return; }
    const rc = r.receipt;
    const rows = rc.sources.map((s) => `<tr><td>${esc(s.id)}</td><td>${s.found ? `found @${s.start}` : esc(s.reason)}</td><td>${s.edits.length ? esc(s.edits.join(", ")) : "-"}</td><td><a href="${esc(s.url ?? "#")}">${esc(s.url ?? "")}</a></td></tr>`).join("");
    out.innerHTML = `<p class="${rc.verdict === "PASS" ? "pass" : "hold"}" id="verdict">${rc.verdict}${rc.reasons.length ? " / " + esc(rc.reasons.join(", ")) : ""}</p>
<p>${esc(r.name)} · ${rc.nodeCount} independent source reads · receiptHash <code>${rc.receiptHash}</code></p>
<table><thead><tr><th>source</th><th>result</th><th>allowed edits</th><th>URL</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">String match only: PASS means every source contains these words (with only the allowed edits); it says nothing about whether the quote supports your argument.</p>`;
  };
  $("check").addEventListener("click", run);
  document.querySelectorAll<HTMLButtonElement>("button[data-cite]").forEach((b) =>
    b.addEventListener("click", () => { sel.value = b.dataset.cite!; quote.value = b.dataset.quote!; run(); }));
}
main().catch((e) => { $("result").textContent = "Could not load opinion texts: " + String(e); });
