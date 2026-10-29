# CRE workflow (quoteproof-verify)

Every node runs the **same code**: it reads both sources itself (CAP `static.case.law` + Cornell LII) and decides with `verifyFromTexts`.
Nodes do not split the sources between them. Only the raw values `{verdict, reasons, receiptHash, sourceSummary}` go into consensus (`consensusIdenticalAggregation`); the brief and the opinion text never leave the node.

## Run (needs `cre login` or CRE_API_KEY; `--broadcast` also needs a funded Sepolia key in CRE_ETH_PRIVATE_KEY)
```
curl -sSL https://app.chain.link/cre/install.sh | bash      # install the CLI (done)
npm i -g bun && (cd workflow && bun install)                # TypeScript workflow build
cre login                                                   # browser login, or export CRE_API_KEY=...
cd cre && cre workflow simulate workflow --target local-simulation --non-interactive --http-payload payload-genuine.json
cre workflow simulate workflow --target local-simulation --non-interactive --http-payload payload-altered.json
```

## Further checks that need no login (evidence in docs/evidence/)
- `cre workflow build workflow --target local-simulation` compiles to WASM (`cre-build.log`).
- `cd workflow && bun test sdk-runtime.test.ts` runs the real workflow code (HTTPClient -> node mode -> consensus) in the CRE SDK test runtime (`cre-sdk-test-runtime.log`).
- `bun run src/infrastructure/localConsensus.ts "372 U.S. 335" "<quote>" 4` has 4 nodes read both sources over the live network and agree by the same rule (`local-consensus-*.log`).

## Simulation result (English USER LOG, exit code recorded)
Dry run (no `--broadcast`): `cd cre && cre workflow simulate workflow --target local-simulation --non-interactive --trigger-index 0 --http-payload payload-genuine.json` -> exit 0, `[USER LOG] Consensus result: PASS  hash=b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198`, `writeReport reply: TX_STATUS_SUCCESS txHash=none (dry run: no transaction sent)` (`docs/evidence/cre-simulate-v3-english-genuine-2026-10-30.log`); altered payload: `HOLD NOT_IN_OPINION` (`...-altered-...log`).

Real Sepolia write (`--broadcast`, key from `~/.config/quoteproof/sepolia.env`, receiver `cre/receiver/QuoteProofReceiver.sol` deployed with `cre/workflow/deployReceiver.ts`): genuine tx `0x5e3822255722ea6cbe3549ea3e1902d10b640db8ffffa9e4b6abd274872f7bc9`, altered tx `0xc192e3b5cc17608c06ea9d8a638f2690b7fb3b26e7ed2f89a37ceb690fbf471a`; re-read with `cre/workflow/verifyChain.ts` (`docs/evidence/chain-write-sepolia-2026-10-30.log`).

After consensus the workflow builds an ABI report `(bytes32 receiptHash, uint8 verdictCode, string reasons)` and calls `EVMClient.writeReport` for `evm.receiverAddress` in `workflow/config.json`. The three further checks above are additional checks, not simulate runs.

## v4: forwarder pin and the brief bridge
- `receiver/QuoteProofReceiver.sol` now takes the forwarder in its constructor; only that address may call `onReport`. Pinned address: Chainlink docs, Forwarder Directory, Simulation Testnets, Ethereum Sepolia `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` (copy: `docs/evidence/cre-forwarder-directory-ts-2026-10-30.md`). Deployed receiver in `workflow/config.json`: `0x65faa0e6f6cd105997c93f9d3b72872e8765bbe8`. Rebuild the artifact: `cd workflow && bun run compileReceiver.ts`; redeploy: `bun run deployReceiver.ts [--forwarder 0x…]`.
- Broadcast runs against the pinned receiver: `docs/evidence/cre-simulate-v4-broadcast-genuine-2026-10-30.log`, `...-altered-...`; chain re-read `docs/evidence/chain-write-sepolia-v4-2026-10-30.log`.
- From the CLI: `bun run verify-brief <brief> --cre-payload <dir> --cre-simulate <row #> [--cre-broadcast]` writes `payload-NN.json` (`{citation, quote}`) and runs the simulation on one of them (`docs/evidence/verify-brief-id-supra-cre-2026-10-30.log`).
