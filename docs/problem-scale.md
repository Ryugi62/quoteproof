# Problem scale and impact (every number opened directly; no press quotes)

No government statistic on fabricated quotations in court filings exists for this domain that we could find, so the primary sources are **public court records and the court-sanction database that cites them**. All rows below were opened by us (curl, 2026-10-31), none is taken from a news article.

## Table 1: numbers and where they come from
| # | Number | Primary source (opened) | Opened |
|---|---|---|---|
| 1 | 2,241 decisions "identified so far" (page text) / 2,242 rows in the CSV | https://www.damiencharlotin.com/hallucinations/ (HTTP 200, 192,999 bytes) and https://www.damiencharlotin.com/hallucinations/hallucinations/download.csv (HTTP 200); the page and the file differ by one, we report both | 2026-10-31 |
| 2 | 1,513 of them in the USA | same CSV, column `State(s)` = `USA` (counted by `bun run src/infrastructure/problemScaleCli.ts`); a re-download on 2026-10-31 gave the same four counts as our pinned 2026-10-30 file (file bytes differ, counts do not) | 2026-10-31 |
| 3 | 503 US rows with a "False Quotes" item (a quotation attributed to a real decision that the court says is not in it) | same CSV, `Hallucination Items` contains `False Quote` | 2026-10-31 |
| 4 | 27 of those 503 name a `NNN U.S. NNN` cite or the Supreme Court inside the false-quote item (heuristic regex, an undercount if the court wrote only a case name) | same CSV | 2026-10-31 |
| 5 | 193 US rows with a monetary penalty above 1 USD, median 2,232 USD (1 USD entries are placeholders and are dropped) | same CSV, column `Monetary Penalty` | 2026-10-31 |
| 6 | USD 5,000 penalty, order of 22 June 2023, 43 pages | court record: *Mata v. Avianca*, S.D.N.Y. 1:22-cv-01461-PKC, Document 54 "Opinion and Order on Sanctions": "a penalty of $5,000 paid into the Registry of the Court" (https://storage.courtlistener.com/recap/gov.uscourts.nysd.575368/gov.uscourts.nysd.575368.54.0.pdf, HTTP 200, 2,341,033 bytes; the govinfo copy of the same docket returned an error page and the Justia copy HTTP 403, so they were not used) | 2026-10-31 |

Raw fetch log: `docs/evidence/problem-scale-sources-2026-10-31.log`. Not counted: any figure from press coverage of these cases.

Limits: the database is one researcher's collection and says it is "a work in progress" (it is not a census of all filings); rows 3-5 are counted by us from its fields; "False Quote" rows are cases a court noticed, not all occurrences.

## Table 2: impact formula
`impact (USD per database period) = N × s × a × c × q × u`

| Symbol | Meaning | Value | Source / status |
|---|---|---|---|
| N | US filings in which a court found a false quotation | 503 | row 3 (observed floor) |
| s | share of N whose quote is attributed to a US Supreme Court opinion (what QuoteProof supports) | 27/503 = 5.4% | row 4 (heuristic, undercount) |
| a | share of such filers who would run a quote check before filing | low 0 · base 10% · high 50% | **assumption, no source**; low = 0 is a possible outcome and is shown |
| c | share of those quotes the tool flags | low 0 · base 1 · high 1 | measured 10/10 on court-identified fake quotes (README Numbers; Wilson lower bound 72.2%); 0 in the low case |
| q | share of US rows that ended in a money penalty | 193/1,513 = 12.8% | row 5 |
| u | unit: median penalty | 2,232 USD | row 5 |

Scenarios (computed by `bun run src/infrastructure/problemScaleCli.ts`, tests in `tests/impact.test.ts`):
- low (a = 0, c = 0): **0 USD**
- base (a = 10%, c = 1): about **769 USD** per database period
- high (a = 50%, c = 1): about **3,844 USD**

Reading: in money terms the avoided penalties inside our scope (Supreme Court quotes only) are small. We do not claim a large market from this; the value claimed is narrower, a checkable receipt for the one question "are these words in the opinion".
