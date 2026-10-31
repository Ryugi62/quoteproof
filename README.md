**Try it now, no install, no login: https://ryugi62.github.io/quoteproof/** (paste a quotation, get PASS or HOLD and the receipt hash in your browser; bundled opinion texts — full live check: CLI)

# QuoteProof — is the quoted sentence really in the court opinion?

> **Scope in one line:** US Supreme Court opinions only (U.S. Reports), command line only (`bun run verify "<cite>" "<quote>"` for one quote, `bun run verify-brief <brief.txt>` for a whole brief, with `Id.`/`supra` followed; an opt-in flag hands one checked quote to the CRE simulator; the browser demo above checks against bundled opinion texts, not live). If the network fails the CLI says `OFFLINE` on its first line and reads the 24 pinned opinions in `fixtures/` instead of the live sources. In the legal-evidence scene (a filed quotation and its receipt), CRE's job is the consensus-and-seal step: independent nodes each read both sources, agree on `{verdict, receiptHash}`, and the workflow writes that pair as a timestamped on-chain report; that step is opt-in and simulator-only, and the default commands do not call CRE.

**False-alarm rate (our headline metric): of the 68 genuine test quotes (sentences that really are in the opinion, both test sets pooled), the share that QuoteProof wrongly holds under its default strict two-source rule = 9/68 = 13.2%; baseline: the 10% target we set in SPEC S2, which the strict default misses.**

Solo project, no legal professional on the team: QuoteProof decides **string match only** (are these words in the opinion) and makes no legal judgement.

## Limits (stated first on purpose)
- **Scope is US Supreme Court opinions (U.S. Reports) only.** Both sources give the opinion text for 21 of the 25 pinned opinions (Brown, Iqbal, Twombly, Sinochem have no LII text, so they are held as `INSUFFICIENT_SOURCES`). No adapters for lower courts, state courts or F.3d. CourtListener needs an API token (anonymous 401) and its web pages sit behind a WAF (403/202), so it is not used.
- **The two sources differ in the text itself**: spelling (removeable/removable), hyphens, commas, footnotes, appendix text. The strict two-source rule therefore holds some genuine quotes (`SOURCE_DISAGREE`): that is the false-alarm rate above. The `punctuationTolerance` option (comma/hyphen/semicolon-only differences) is a **post-hoc policy added after the dev-set failures were seen**; the holdout set is the only out-of-sample check of it, and it is small. The default stays strict.
- **Test-set size**: per set 34 genuine (+3 borderline) and 42 altered, two sets, plus 10 public cases. Wilson 95% intervals are wide (upper bounds around 20% for the false-alarm rate). Altered quotes were written by the author and mostly follow the same types the matcher has rules for, so the 0% miss rate is optimistic. Only the 10 public cases carry labels set by someone else (courts that found the quote missing).
- **Brief check**: full `NNN U.S. NNN` citations, `NNN U.S. at NNN` short cites that resolve to exactly one full cite, and `Id.`/`supra` that tie to one U.S. Reports case are checked; the page number after `at` is not used (the whole opinion is searched). `Id.` is tied to the nearest previous citation by text order, which is a heuristic (string cites joined by `;` are refused as ambiguous). Parallel-only cites, footnoted quotes and quotes shorter than 3 words are not checked. Quotes cited to other reporters or to an unresolvable `Id.`/`supra` are listed as `NOT_CHECKED` with the reason, not passed. Tests: `tests/brief.test.ts` (8 `Id.`/`supra` cases).
- **robots.txt (read 2026-10-30, copies in `docs/evidence/`)**: Cornell LII asks `Crawl-delay: 10` and does not disallow `/supremecourt/text/`; the CLIs wait that long between requests to the same host (the logs print the waits, e.g. `waiting 10.0s ... (robots.txt Crawl-delay 10s)`), also when four local consensus nodes ask at once. **Harvard CAP's `static.case.law/robots.txt` says `User-agent: *` / `Disallow: /`** (file dated 2024-03-04, the same month as the announcement that the data is released without restriction). We noticed this only in v4, after the 24 pinned CAP files had been downloaded in v3. The CLI still reads one CAP file per cited opinion because a person asked for that check (one GET, no link following, cached) and prints a NOTE; we read robots.txt as a rule for crawlers, and the site owner may read it differently. `QUOTEPROOF_ROBOTS=strict` skips CAP (then the verdict is `HOLD / INSUFFICIENT_SOURCES`). The bulk scripts (`fetchFixtures`, `checkLive`) run in strict mode and therefore no longer touch CAP. CRE workflow nodes cannot sleep and make no robots check: one request per source per run, so the spacing between runs is up to the caller.
- Unverified: meaning-preserving negation omissions (3 borderline cases, human judgement) are all held as suspected distortion. Sentence boundaries are fragile around abbreviations (U. S., Mr.). English US opinions only. Whether the quote supports the legal argument is out of scope.
- **CRE (read this first)**: the default commands never call CRE. CRE is an opt-in, simulator-only step (`--cre-simulate`, dry run; `--cre-broadcast` for a Sepolia transaction through the *mock* forwarder). The simulator runs the workflow once per simulated node on this machine; "Four local nodes" in the demo are our own Bun processes (`localConsensus.ts`, quorum 3 of 4), a separate check that is **not** the CRE network. `cre workflow simulate` succeeded for both payloads (logs in `docs/evidence/`). The chain write was measured on Sepolia testnet through the simulator's `--broadcast` into our own receiver, which since v4 accepts only the documented **mock** forwarder; nothing is deployed on the CRE network or on mainnet and the production forwarder is untested. The CRE path is opt-in (`--cre-payload`/`--cre-simulate`); it sends the single quote and its citation to the CRE tooling, and we did not use a confidential workflow, so on a real DON those quotes would be visible to the nodes. The faucet survey (`docs/evidence/faucet-survey-2026-10-30.log`) records why the other faucets could not be used (login or mainnet balance).


QuoteProof re-reads the opinion from **two public sources** (Harvard CAP + Cornell LII) for every quote, holds the quote unless both agree, and writes one **receipt per quoted sentence** (source URLs, node count, per-source text hash and position, receipt hash). Several tools already check quotes. We do not claim to be the first, and we claim no accuracy advantage.

## Prior work (free / open source and research, read 2026-10-31; paid products in the table further down)
| Name (link) | What it does (from its own README / abstract) | What QuoteProof does differently |
|---|---|---|
| Hallucination Shield ([github.com/sboghossian/hallucination-shield](https://github.com/sboghossian/hallucination-shield)) | Free MIT web app: checks citations against CourtListener, GovInfo and Justia (Justia as fallback), fuzzy-matches quoted passages, adds an LLM check of whether the case supports the sentence, outputs a PDF report with a SHA-256 input hash | Reads every quote from two independent sources at the same time (CAP + LII) and holds unless both agree; one receipt per quote with each source's URL and text hash, not one report per brief |
| citation-verifier ([github.com/rlfordon/citation-verifier](https://github.com/rlfordon/citation-verifier)) | Python tool on CourtListener: citation lookup, then `check-quotes`, a deterministic fuzzy string comparison of each quote with the downloaded opinion (LLM only for claim extraction and support judgement) | Two independent sources instead of one; a quote must be found in both with the same allowed edits; receipt per quote |
| KrokAI Law ([github.com/igorsaevets/krokai-law](https://github.com/igorsaevets/krokai-law)) | Checks quotations against law text you downloaded to your own disk, flags quotes cut one clause early, regression harness that mutates already-verified quotes | Re-reads two live public sources per quote instead of a local library; receipt per quote |
| *Who Checks the Citations? Benchmarking Legal Hallucination Detection* ([arXiv 2606.21155](https://arxiv.org/abs/2606.21155)) | Research paper: taxonomy of citation hallucinations and 1,300 brief excerpts with injected errors; benchmarks five models (GPT-5 84.4% recall in an agentic setting) | A runnable CLI, not a benchmark; our own test sets are small (see Limits) and not comparable with theirs |

What QuoteProof adds to this list is narrow: **two independent public sources re-read together for each quote, and a quote-level receipt that names both source URLs and node count**. In what we read we did not find a tool that does both, but our search was limited, so this is a description of our design, not a claim of priority. We have not run these tools, so we make no accuracy comparison.

## Compared with citation checkers (official pages / registry entries read 2026-10-31; raw notes `docs/evidence/competitors-2026-10-31.md`)
| Tool (source read) | Unit it checks | Agreement between independent reads | Shared receipt |
|---|---|---|---|
| CourtListener Citation Lookup (`courtlistener.com/help/api/rest/citation-lookup/`) | the **citation** ("look up either an individual citation or ... every citation in a block of text", "a guardrail to help prevent hallucinated citations"); the page says nothing about checking quoted words | one database (CourtListener); no cross-check | JSON list of citation, status and cluster; no hash |
| Citation Safe Verifier (MCP Registry entry `com.citationsafe/verifier`: "existence, quote match, proposition support") | citation, **and a quote match** (per its registry description) | not stated; its site `citationsafe.com` did not answer from here, so the method is **cannot be confirmed** | not stated; Glama lists a `get_verification` tool for past results, format unconfirmed |
| LegalCite (`github.com/Kevinx702/legalcite` README, `legalcite-one.vercel.app`) | the **case citation** ("Verifies citation existence/metadata only"), verdicts real / not-found / mismatch | one source (CourtListener) | a printed verification report per brief |
| **QuoteProof** | **each quoted sentence** in the opinion text | **two independent public sources (CAP + LII) must both contain it, and nodes agree on verdict + hash** (opt-in CRE step) | **one receipt per quote with both source URLs and a recomputable hash** |

Three differences, as plain statements: (1) unit: QuoteProof's default object is the quoted sentence, not the citation (Citation Safe Verifier says it also matches quotes; we could not read how); (2) agreement: two sources are required to agree before PASS, the tools above name one source or state nothing; (3) receipt: a hash anyone can recompute from public sources. We did not run these tools and claim no accuracy difference.

## Tested on real fake quotes from outside (court-labelled, Charlotin DB)
| Test input | Count | Held (correct) | Held for the court's reason (`NOT_IN_OPINION`) | Held for another reason (noise) | Wrongly passed |
|---|---|---|---|---|---|
| Quotes a court found NOT in the Supreme Court opinion they were attributed to (P1-P10 in `fixtures/public-cases.json`; P9-P10 added 2026-10-31 from the *Vita Law Offices* row) | **10** | 10 | 9 | 1 (P2, *Sinochem*: no LII text, `INSUFFICIENT_SOURCES`) | **0** |

17 cases are listed in the database export; 7 cannot be tested (no quote text in the database, or lower court). Full table: `fixtures/eval-results.md`. The ten come from eight court decisions, so they are not independent draws.

## Problem scale (primary sources opened 2026-10-31, `docs/problem-scale.md`)
| Number | Source |
|---|---|
| 2,241 decisions in the Charlotin database (page text; 2,242 CSV rows), 1,513 in the USA | `damiencharlotin.com/hallucinations/` and its CSV |
| 503 US rows with a false-quotation item; 27 of them name a Supreme Court cite | same CSV, counted by `src/infrastructure/problemScaleCli.ts` |
| USD 5,000 penalty, 22 June 2023 | court record, *Mata v. Avianca*, S.D.N.Y., Document 54 |

Impact formula: `N × s × a × c × q × u` (503 × 5.4% × adoption `a` × detection `c` × 12.8% penalised × USD 2,232 median). Low case (a = 0): **0 USD**; assumed base (a = 10%): about 769 USD per database period. In money the avoided penalties in our scope are small; symbols and sources in the doc.

## How it works in five lines (full text: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
1. A quote plus its `NNN U.S. NNN` citation becomes two read-only GETs (Harvard CAP, Cornell LII); only the citation and the quote are used to build them, the brief stays local.
2. `matchQuote` runs on each source text (segments, ellipsis, brackets, negation check); PASS needs every source to find it with the same edits and no dropped negation, anything else is HOLD with a reason code.
3. The result is a `Receipt`; `receiptHash = sha256(canonical JSON without time)`, so the same input gives the same hash.
4. The `domain/` code is pure; `application/`, `adapters/`, `infrastructure/` sit above it and a test forbids reverse imports. `cre/workflow/main.ts` imports the same `verifyFromTexts` the CLI uses.
5. The default CLI never calls CRE. Only with `--cre-payload` + `--cre-simulate` does one quote go to the CRE simulator, where the workflow runs once per simulated node on this machine; only `{verdict, reasons, receiptHash, sourceSummary}` goes to consensus and into the EVM report.

**One-minute explanation.** A lawyer (or a pro se filer, as in the *Allen* case below) puts a sentence in quotation marks. QuoteProof re-reads that opinion from **two independent public sources** (Harvard CAP + Cornell LII), does not trust the filer, and checks that the quoted words are **actually there**.

**Paid products** (official pages, read 2026-10-30):

| Tool (official page, read 2026-10-30) | What the page says about quotes | Method / error rates stated on the page | Access |
|---|---|---|---|
| Westlaw Edge **Quick Check** (Thomson Reuters, `legal.thomsonreuters.com/en/products/westlaw-edge/quick-check`) | report includes "an analysis of quotations"; helps "quickly verify your citations and quotations" | not stated | part of paid Westlaw Edge (free trial offered) |
| **Lexis+ Brief Analysis** (LexisNexis, `lexisnexis.com/pdf/lexisplus/experience-brief-analysis.pdf`) | "Quote Check ... detects errors in cited quotes" | not stated | paid Lexis+ |
| **Clearbrief** (`clearbrief.com`) | "flags potential hallucinations, citation errors, inaccurate quotes" before filing | not stated | "$300 per user per month" (solo plan) |
| QuoteProof (this repo) | words in the quote must be in the opinion; allowed edits pass, changed/added words and meaning-flipping omissions are held | published here: 13.2% false alarm (strict), 0/84 miss on our own altered set, 0/10 on court-identified fake quotes | free, MIT, reproduce with `bun run eval` |

We could not read how the three commercial checks work or what their error rates are, so we claim no accuracy comparison. What this repo offers is checkable: public sources anyone can open, a receipt hash anyone can recompute, and numbers (with their limits below).
Legitimate editing passes (ellipsis `…`, `[t]he`, `[the Court]`, line breaks, curly quotes). A changed word, an added word, a negation removed by an ellipsis, or a content word laundered through brackets is **held (HOLD)**.
The command-line check and the CRE workflow run the same function (`verifyFromTexts`, imported by `cre/workflow/main.ts`, not a copy). **The default commands (`verify`, `verify-brief`) do not call CRE** and need no account or login. CRE is opt-in: `bun run verify-brief <brief> --cre-payload <dir> --cre-simulate <row #>` writes the checked quote of that row as the CRE workflow's HTTP payload and runs `cre workflow simulate` on it (a **dry run**, `txHash=none`), then compares the CRE consensus hash with the local receipt hash; adding `--cre-broadcast` passes the simulator's `--broadcast` and sends a **real Sepolia testnet transaction through the mock forwarder** (flow and logs below). It is not a deployment on the CRE network.
Every result carries a **receipt** (opinion, text position, allowed edits, per-source match with its source URL, node count, time) and a **receipt hash**. Same input, same hash. When the CRE step is used, the workflow (run once per simulated node, locally) reaches consensus on the verdict and the hash, builds an **EVM `writeReport`** with them for a Sepolia receiver contract, and returns them; the brief stays local. `cre workflow simulate` has two modes here. Without `--broadcast` (CLI: without `--cre-broadcast`) the write is a dry run: `TX_STATUS_SUCCESS` with `txHash=none (dry run: no transaction sent)`. With `--broadcast` (CLI: `--cre-broadcast`; funded with a testnet key made locally, 0.05 SepETH from a no-login PoW faucet) the report is a real Sepolia transaction.


```
$ bun run verify "372 U.S. 335" "any person haled into court, who is too poor to hire a lawyer, cannot be assured a fair trial unless counsel is provided for him"
verdict PASS · cap found @12029 · lii found @13212 · receiptHash b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198
(same sentence with the meaning flipped → HOLD / NOT_IN_OPINION, hash f341e464…)
```

## Sepolia evidence (testnet, simulator `--broadcast`, mock forwarder)
**The receiver pins the forwarder.** [`cre/receiver/QuoteProofReceiver.sol`](cre/receiver/QuoteProofReceiver.sol) takes the CRE forwarder address in its constructor and `onReport` reverts (`NotForwarder`) for any other caller. The address is the **Ethereum Sepolia "Mock Forwarder Address" from Chainlink's own Forwarder Directory** (`0x15fC6ae953E024d975e77382eEeC56A9101f9F88`, page text saved as `docs/evidence/cre-forwarder-directory-ts-2026-10-30.md`); it is also the `to` of our earlier (v3) transactions. Receiver `0x65faa0e6f6cd105997c93f9d3b72872e8765bbe8` (deploy tx `0x5a3a35d636bcfcc44315e0388bdbe66b1941a76f950c578b0d1dea8bf2721c2b`): genuine payload tx `0x1cf907540bd6d595beae2ca7daeeda7504b38b1ed7469a66202c6c225a41b14f` (PASS, verdictCode 1) from `cre workflow simulate workflow --target local-simulation --non-interactive --trigger-index 0 --http-payload payload-genuine.json --broadcast`, altered payload tx `0x1f4f83d83957066648a92cde6b650b6022414bd0a7a408f892d5cd47142e7f8f` (HOLD / NOT_IN_OPINION, verdictCode 0) from the same command with `payload-altered.json` (commands copied from the `# command:` lines of `cre-simulate-v4-broadcast-genuine-2026-10-30.log` and `...-altered-...log`). The verify-brief route to a third transaction is shown below. Re-read from a Sepolia RPC: the `QuoteVerdict` event, `tx.to == receiver.forwarder()`, and a direct `onReport` call from a non-forwarder address reverts — `docs/evidence/chain-write-sepolia-v4-2026-10-30.log`. A test runs the compiled bytecode in an EVM (`cre/workflow/forwarder.test.ts`). The earlier receiver (no pin) and its transactions stay in `docs/evidence/chain-write-sepolia-2026-10-30.log` as history. Testnet only, simulator `--broadcast` with the *mock* forwarder, **not** a deployment on the CRE network (the production forwarder is a different address in the same directory; we did not use it).
What the on-chain record is: a timestamped seal of `{receiptHash, verdict}` that anyone can re-read; it is not a legal proof of anything beyond "this hash and verdict were reported at this block".

## Check a whole brief
`bun run verify-brief <brief.txt|.md>` pulls every quotation (straight or curly quotes, ≥3 words) out of the brief together with its `NNN U.S. NNN` citation, checks each pair with the same two-source rule, and prints one row per quote plus a summary line. A quote without a supported citation is reported as `NOT_CHECKED` with the reason and is never counted as a pass. Only source URLs built from the citations are requested; the brief text and the quote words never leave the machine (a test records every request URL).
Citation rules: a full cite after or before the quote; `496 U.S. at 398` is resolved when the brief has exactly one full cite for that volume. **`Id.` / `Id. at N` is tied to the immediately preceding citation, and `Gideon, supra` to the one earlier case whose name matches.** Where it cannot be tied the row says why: `ID_NO_ANTECEDENT`, `ID_ANTECEDENT_NOT_CHECKABLE` (the previous cite is a lower-court reporter, so the `Id.` is not guessed onto another case), `ID_AMBIGUOUS` (previous cite is one of several joined by `;`), `UNRESOLVED_SUPRA`.
Run on `fixtures/brief-example-allen.txt`, an example brief we wrote around the two quotations that the court in *Allen v. Western Governors University* (D. Nev., 2026-03-31) found not to be in *Cooter & Gell* (it is not the filing) — full log `docs/evidence/verify-brief-allen-2026-10-30.log`:
```
#  | verdict     | citation     | detail                           | quote
1  | HOLD        | 496 U.S. 384 | NOT_IN_OPINION 801f457e          | a reasonable attorney in like circumstances could believe h…
2  | HOLD        | 496 U.S. 384 | NOT_IN_OPINION e44880f7          | as a bar to the courthouse door
3  | PASS        | 496 U.S. 384 | hash e32f1e72                    | Rule 38 gives appellate courts ample authority to award exp…
4  | PASS        | 372 U.S. 335 | hash b5fc1c1a                    | any person haled into court, who is too poor to hire a lawy…
5  | NOT_CHECKED | -            | UNSUPPORTED_REPORTER             | a party must show prejudice before the court may dismiss th…
Summary: 5 quotes found · 2 PASS · 2 HOLD · 1 not checked (no supported citation) · brief text stayed local
```
**Brief -> CRE (opt-in).** The same command on `fixtures/brief-example-id-supra.txt` (also written by us; rows 1-2 reach their case through `Id.`, row 3 through `Cooter & Gell, supra`, row 4 follows a `123 F.3d` cite and is therefore not guessed) with `--cre-payload <dir> --cre-simulate 3 --cre-broadcast` (**with** `--cre-broadcast`: a real Sepolia transaction, `txHash=0xc8a2…`; the same command **without** it is a dry run, `txHash=none`, as in Run B of the log): the PASS row's quote goes to the CRE workflow as `{"citation","quote"}` (nothing else from the brief), the simulator reaches consensus, writes to our pinned receiver, and the CRE hash equals the local receipt hash. Log `docs/evidence/verify-brief-id-supra-cre-2026-10-30.log`:
```
Summary: 4 quotes found · 2 PASS · 1 HOLD · 1 not checked (no supported citation) · brief text stayed local
CRE payloads: 3 written to <dir>/ (each = one quote + its citation; 1 not-checked row(s) listed in index.json only)
CRE row 3: payload-03.json -> [USER LOG] Consensus result: PASS hash=e32f1e72…
CRE row 3: [USER LOG] writeReport reply: TX_STATUS_SUCCESS txHash=0xc8a2798281d72b26bd6ff5c34d5bf8769a8ef376d86074b0f1a0f1261ea1fff8 err=-
CRE consensus hash == local receipt hash (e32f1e72…, verdict PASS)
```
(That transaction was re-read from the chain in the same log: `to` = the pinned forwarder.) Without `--cre-simulate` the files are only written; without `--cre-broadcast` the simulation is a dry run (`txHash=none`); without `--cre-payload` nothing is written and CRE is never called. Not handled (see Limits): quotes inside footnotes, paraphrases without quotation marks, lower-court opinions.

**Demo video (under 3 min, subtitles only, every screen a real run):** [`demo/quoteproof-demo.mp4`](demo/quoteproof-demo.mp4) · subtitles [`demo/quoteproof-demo.srt`](demo/quoteproof-demo.srt) · `demo/timeline.json` · rebuild with `bash demo/capture.sh && python3 demo/render.py`.

## Numbers (generated by `bun run eval`, copied from `fixtures/eval-results.md`; a test checks this table against `eval-results.json`)
Genuine = quotes that really are in the opinion (false alarm = genuine but held). Altered = quotes we corrupted (miss = altered but passed). Wilson 95% interval in the second line of the pooled rows.

| Set · configuration | False alarm (genuine → HOLD) | Miss (altered → PASS) |
|---|---|---|
| Dev set · 2 sources, strict (default) | 4/34 = 11.8% | 0/42 = 0.0% |
| Dev set · 2 sources, punctuation tolerance (post-hoc policy) | 3/34 = 8.8% | 0/42 = 0.0% |
| Holdout · 2 sources, strict (default) | 5/34 = 14.7% | 0/42 = 0.0% |
| Holdout · 2 sources, punctuation tolerance (post-hoc policy) | 3/34 = 8.8% | 0/42 = 0.0% |
| **Both sets pooled · strict (default)** | **9/68 = 13.2%** [7.1–23.3] | **0/84 = 0.0%** [0.0–4.4] |
| Both sets pooled · punctuation tolerance | 6/68 = 8.8% [4.1–17.9] | 0/84 = 0.0% [0.0–4.4] |
| Public cases (court-identified fake quotes, Charlotin DB): 10 tested | n/a | 0/10 passed [0.0–27.8] |
| Public cases: 7 listed but not testable (5 Supreme Court cites whose quote text the DB does not give, 2 lower-court quotes with no adapter) | n/a | not counted either way |


- The CAP-only row of 0% false alarm is circular: genuine quotes were cut from CAP text, so CAP agrees with them by construction. It is not evidence. Only the court-labelled public cases (10 tested, 17 listed) come from outside our hands.
- Target in SPEC was false alarm ≤ 10%: **the strict default misses it (13.2%)**; only the post-hoc tolerance policy meets it (8.8%, upper bound 17.9%).
- Re-running at another clock time gives identical receipt hashes for all 79 cases × 2 policies × 2 sets.
- Most false alarms are the two sources disagreeing (OCR typo, appendix text, punctuation), not the matching rules. Two-source agreement flags text differences that a single source would pass; one you can check yourself: `grep -c definance fixtures/raw/lii-text/mapp-1961.txt fixtures/raw/cap/mapp-1961.json` finds the typo `definance` in the LII text (1) and not in CAP (0).

## Sponsor / track checklist
| Item | State |
|---|---|
| Track | LegalTech & RegTech (legal automation) |
| Chainlink CRE workflow code (`cre/workflow/main.ts`; the simulator runs it once per node, locally; each run reads both sources; consensus on verdict + hash) | written; `cre workflow build` compiled (WASM) |
| `cre workflow simulate` (CRE CLI v1.39.0, English USER LOG, with the EVM write) | **success, exit 0, 2026-10-30**, genuine payload: `[USER LOG] Consensus result: PASS  hash=b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198`, then `[USER LOG] writeReport reply: TX_STATUS_SUCCESS txHash=none (dry run: no transaction sent) err=-` — `docs/evidence/cre-simulate-v3-english-genuine-2026-10-30.log`. Altered payload: `Consensus result: HOLD NOT_IN_OPINION`, same write path — `cre-simulate-v3-english-altered-2026-10-30.log` |
| On-chain write (EVM `writeReport`, Sepolia) | **measured on Sepolia, 2026-10-30.** v4 receiver with the forwarder pinned (deploy tx `0x5a3a35d636bcfcc44315e0388bdbe66b1941a76f950c578b0d1dea8bf2721c2b`), two `cre workflow simulate --broadcast` runs wrote reports (txs above), re-read from the chain (`tx.to == forwarder()`, direct call reverts): `docs/evidence/chain-write-sepolia-v4-2026-10-30.log`; logs `cre-simulate-v4-broadcast-genuine-2026-10-30.log`, `...-altered-...`. Without `--broadcast` the same workflow is a dry run (`txHash=none`). **Not shown:** a deployment on the CRE network, the production forwarder, mainnet use |
| CRE as an opt-in step of the product path | `verify-brief ... --cre-payload ... --cre-simulate N` (dry run; `--cre-broadcast` for a real Sepolia transaction) sends the brief's checked quote through the workflow, and the CRE consensus hash equals the local receipt hash (`docs/evidence/verify-brief-id-supra-cre-2026-10-30.log`). The default CLI path does not call CRE and needs no CRE account; CRE is a simulator-only, local step here |
| Live deployment on the CRE network | no (simulation only) |

- Spec: [SPEC.md](SPEC.md) · Evidence logs: `docs/evidence/` · Table source: `fixtures/eval-results.md`
## Run it
```
bun install                         # needs bun: npm i -g bun
bun test                            # 91 tests (tests/ only): matching, web-demo rule parity, problem-scale/impact formula,, receipts, source adapters, consensus, brief extraction incl. Id./supra, robots.txt delays, CRE payloads, README numbers, layer rule (no reverse imports)
bun run verify-brief fixtures/brief-example-allen.txt   # whole-brief check (exit 1 = at least one HOLD; waits 10 s between requests to law.cornell.edu)
bun run verify-brief fixtures/brief-example-id-supra.txt --cre-payload /tmp/qp-cre --cre-simulate 3   # dry run (txHash=none), no --cre-broadcast; needs the cre CLI; exit 2 if the CRE step fails
bun run verify-brief fixtures/brief-example-id-supra.txt --cre-payload /tmp/qp-cre --cre-simulate 3 --cre-broadcast   # real Sepolia transaction via the simulator --broadcast (needs a funded testnet key in CRE_ETH_PRIVATE_KEY; this is the command in the logged run)
# a clean-clone run of the v5 tree (84 + 19 tests then; v5.2 adds 7 tests): docs/evidence/clean-clone-v5-2026-10-31.log
bash tools/check_readme.sh          # compares README claims with the code and logs: test counts, evidence paths, latest hash and USER LOG line, video length
bun run web:build                   # rebuild web/ (opinions.json + app.js) for the browser demo; tests/web.test.ts checks it gives the CLI's receipt hash
bun run eval                        # both test sets + 10 public cases -> false-alarm / miss tables (fixtures/eval-results.md)
bun run verify "372 U.S. 335" "any person haled into court, ... counsel is provided for him"   # live check CLI (this one is HELD: DISTORTION, the ellipsis hides "cannot ... unless")
bun run src/infrastructure/localConsensus.ts "372 U.S. 335" "<quote>" 4   # 4 local Bun processes (not CRE nodes) read both sources live and agree (3-of-4 quorum)
bun run src/infrastructure/checkLive.ts      # are the pinned fixtures still byte-identical to the live sources? (strict robots mode, so CAP is skipped and counted as skipped; the v3 log fixtures-vs-live.log covers both sources)
cd cre/workflow && bun run verifyChain.ts <txHash> <receiverAddress> [--direct-call-check]   # re-read a Sepolia report: event, tx.to == forwarder(), non-forwarder call reverts (needs only the public RPC)
cd cre/workflow && bun run compileReceiver.ts   # solc-js 0.8.28: QuoteProofReceiver.sol -> receiver/QuoteProofReceiver.json (a test checks the committed file matches the source)
bun run test:cre                    # (= cd cre/workflow && bun install && bun test) 19 tests: the CRE workflow code, the on-chain report encoding in the CRE SDK test runtime, and the receiver bytecode in an EVM (forwarder pin)
bash demo/capture.sh && python3 demo/render.py   # rebuild the demo video from real runs (needs ffmpeg, Pillow)
```

## Structure (a test enforces zero reverse imports; full text in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
```
domain         pure: normalize, matchQuote (segments, ellipsis, brackets, negation check), verdict, Receipt, SHA-256, brief quote extraction (incl. Id./supra resolution)
   ^
application    verifyQuote / verifyFromTexts / verifyBrief / creBridge (payloads, CRE log parsing), ports (Fetcher, Source), consensus (quorum), evaluate (Wilson intervals)
   ^
adapters       CAP JSON text extraction, Cornell LII HTML text extraction, citation parser ("372 U.S. 335"), robots.txt parser
   ^
infrastructure fetch (robots-aware, per-host delay), CLIs, evaluation runner, fixtures, local multi-node consensus, CRE workflow (cre/workflow/main.ts)
```
One check: citation -> two read-only GETs (CAP, LII) -> `matchQuote` per source -> all found with the same edits and no dropped negation = PASS; anything else = HOLD with a reason code -> Receipt -> `receiptHash = sha256(canonical JSON without time)`. The brief and the opinion text never leave the node; only `{verdict, reasons, receiptHash, sourceSummary}` goes to consensus and into the EVM report.

## License and data (checked 2026-10-30 against the sources' own pages)
- Code: MIT (see `LICENSE`).
- **Cornell LII**: `about.law.cornell.edu/terms/` says LII's compilation and pages are Cornell copyright, covered by CC BY-NC-SA 2.5, and that "Distribution of these pages ... does not constitute consent to any use of this material for commercial redistribution"; where the underlying text is a government document it "lies in the public domain" and LII claims copyright only in "markup, navigation apparatus, and other value-added features". `law.cornell.edu/supct/credits.html` says Supreme Court decisions "can be used and redistributed without permission". So this repo **does not contain LII pages**: `fixtures/raw/lii-text/` holds only the extracted opinion text (no markup), and `bun run fixtures` re-downloads and re-extracts it. LII's `robots.txt` asks for a 10 s crawl delay; since v4 all fetching code (CLIs, fixture refresh, live check, local consensus) waits that long between requests to `www.law.cornell.edu`.
- **Harvard Caselaw Access Project** (`static.case.law`): the Library Innovation Lab announced in March 2024 that the original access limits "expired" and the data "can now be fully released without restriction on access or use". We could not open case.law's own terms page (it needs JavaScript), so this rests on that announcement; `fixtures/raw/cap/` keeps the JSON as served, and `fixtures/manifest.json` has each file's URL, retrieval time and sha256, so it can be dropped and re-fetched at any time.
- Opinion texts are US court opinions (government works). They are included only so tests run offline.
- The public-case list is from Damien Charlotin's AI Hallucination Cases database (CC BY 4.0, https://www.damiencharlotin.com/hallucinations/).

## Changelog
- **v5.2 (2026-10-31):** browser demo `web/` (same `verifyFromTexts` as the CLI, rule-parity test `tests/web.test.ts`); public cases 8 -> 10 tested (Carden v. Arkoma added to the pinned fixtures); problem-scale and impact doc with formula and tests (`docs/problem-scale.md`, `tests/impact.test.ts`); comparison with three citation checkers; false-alarm definition sentence.
- **v5 (2026-10-31):** receipts now carry each source's URL (`sources[].url`) and `nodeCount` (outside the hash, so every earlier receipt hash is unchanged; SPEC §17); `cre/workflow/receiver.test.ts` privacy assertion replaced (the old one could not fail) by `privacyCheck.ts`; README gains the Prior work table and drops the claim that the setup is new.
- **v4.1 (2026-10-30, documentation only, no code change):** README order (Limits first, five-line architecture summary, Changelog last); every command line that carries a Sepolia transaction hash now shows the flag actually used (`--cre-broadcast` / `--broadcast`, copied from the logs) and dry-run lines say `txHash=none`; the Vision and demo subtitles no longer read as if CRE were the default path or as if several CRE nodes ran it.
- **v4:** receiver pins the forwarder (documented Ethereum Sepolia mock forwarder) and was redeployed; `robots.txt` handling (LII `Crawl-delay` 10 s per host, CAP `Disallow` disclosed, `QUOTEPROOF_ROBOTS=strict`); `Id.`/`supra` resolution in `verify-brief` (`ID_*`, `UNRESOLVED_SUPRA` reasons); `--cre-payload` / `--cre-simulate` / `--cre-broadcast` bridge from the brief check to the CRE simulator; demo video rebuilt.
- **v3:** `verify-brief` (whole-brief check), Sepolia receiver (no forwarder pin) deployed and the first `--broadcast` transactions measured, English USER LOG from the CRE CLI, `tools/check_readme.sh`, clean-clone log.
- **v2:** CRE EVM `writeReport` (dry run), 15 public cases (8 tested), commercial-tool table, OFFLINE fallback.
- **v1:** `verify`, two-source matching, receipts, evaluation sets, CRE workflow code, 4-process local consensus.
