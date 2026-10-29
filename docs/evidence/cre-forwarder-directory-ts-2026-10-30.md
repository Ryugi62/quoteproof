# Forwarder Directory
Source: https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts
Last Updated: 2026-09-18

> For the complete documentation index, see [llms.txt](/llms.txt).

> **NOTE: Looking for supported networks?**
>
> For a complete list of supported networks and version requirements, see [Supported Networks](/cre/supported-networks).

> **TIP: Tenant-scoped chain list**
>
> Chain availability and forwarder addresses depend on your CRE tenant. Run [`cre workflow
>   supported-chains`](/cre/reference/cli/workflow#cre-workflow-supported-chains) after `cre login` to see the chains and
> forwarder addresses enabled for your organization. Use `--output json` for scripting.

This page lists forwarder contract addresses for CRE workflows, organized by network.

## How to Use This Page

This reference provides three key pieces of information for each network:

1. **Network Name**: The human-readable network identifier (click to view the forwarder contract on the block explorer)
2. **Chain Name**: The value to use in your [`project.yaml`](/cre/reference/project-configuration-ts#31-global-configuration-projectyaml) configuration and [EVM Client code](/cre/reference/sdk/evm-client-ts#chain-selectors)
3. **Forwarder Address**: The contract address for optional consumer contract validation

## Understanding Forwarder Addresses

Forwarder addresses identify the trusted Chainlink Forwarder contract that delivers verified workflow reports to your consumer contract. Your workflow code does not interact with forwarders directly—the EVM capability handles report delivery automatically. Learn more: [Onchain Write Overview](/cre/guides/workflow/using-evm-client/onchain-write/overview-ts).

**Using the [ReceiverTemplate](/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts#3-using-receivertemplate) (recommended)**: If you use the [`ReceiverTemplate`](/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts#3-using-receivertemplate), the forwarder address is **required** in the constructor. This ensures your contract only accepts reports from the trusted Chainlink Forwarder.

**Custom implementations**: If you implement the `IReceiver` interface directly without using `ReceiverTemplate`, you control your own security checks. See [Building Consumer Contracts](/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts) for details.

### Simulation vs Production Addresses

**Important**: Forwarder contracts differ between local simulation and production:

| Environment      | Contract Type           | Section                                         |
| ---------------- | ----------------------- | ----------------------------------------------- |
| Local simulation | `MockKeystoneForwarder` | [Simulation Forwarders](#simulation-forwarders) |
| Production       | `KeystoneForwarder`     | [Production Forwarders](#production-forwarders) |

If you configure forwarder validation in your consumer contract, **remember to update the forwarder address** when deploying to production. Learn more: [Working with Simulation](/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts#4-working-with-simulation).

## Simulation Forwarders

These `MockKeystoneForwarder` addresses are used when running `cre workflow simulate` with the `--broadcast` flag. Use these addresses **only** during local development and testing.

The tables below reflect chains commonly enabled for simulation. Your tenant may have a different set — run [`cre workflow supported-chains`](/cre/reference/cli/workflow#cre-workflow-supported-chains) for the authoritative list and forwarder addresses for your organization.

### Simulation Mainnets

| Network             | Chain Name                    | Mock Forwarder Address                     |
| ------------------- | ----------------------------- | ------------------------------------------ |
| Arbitrum One        | ethereum-mainnet-arbitrum-1   | 0xd770499057619c9a76205fd4168161cf94abc532 |
| Avalanche           | avalanche-mainnet             | 0xdc21e279934ff6721cadfdd112dafb3261f09a2c |
| Base                | ethereum-mainnet-base-1       | 0x5e342a8438b4f5d39e72875fcee6f76b39cce548 |
| BNB Smart Chain     | binance\_smart\_chain-mainnet | 0x6f3239bbb26e98961e1115aba83f8a282e5508c8 |
| Celo                | celo-mainnet                  | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Ethereum Mainnet    | ethereum-mainnet              | 0xa3d1ad4ac559a6575a114998affb2fb2ec97a7d9 |
| Gnosis Chain        | gnosis\_chain-mainnet         | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Hyperliquid Mainnet | hyperliquid-mainnet           | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Ink                 | ethereum-mainnet-ink-1        | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Jovay Mainnet       | jovay-mainnet                 | 0x2B3068C4B288A2CD1f8B3613b8f33ef7cEecadC4 |
| Linea               | ethereum-mainnet-linea-1      | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Mantle              | ethereum-mainnet-mantle-1     | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| MegaETH             | megaeth-mainnet               | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Monad               | monad-mainnet                 | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| OP Mainnet          | ethereum-mainnet-optimism-1   | 0x9119a1501550ed94a3f2794038ed9258337afa18 |
| Pharos Mainnet      | pharos-mainnet                | 0x2B3068C4B288A2CD1f8B3613b8f33ef7cEecadC4 |
| Plasma              | plasma-mainnet                | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Polygon             | polygon-mainnet               | 0xf458d621885e29a5003ea9bbba5280d54e19b1ce |
| Scroll              | ethereum-mainnet-scroll-1     | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Sonic               | sonic-mainnet                 | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| World Chain         | ethereum-mainnet-worldchain-1 | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| XLayer Mainnet      | ethereum-mainnet-xlayer-1     | 0x2B3068C4B288A2CD1f8B3613b8f33ef7cEecadC4 |
| ZKSync Era          | ethereum-mainnet-zksync-1     | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |

### Simulation Testnets

| Network                     | Chain Name                            | Mock Forwarder Address                     |
| --------------------------- | ------------------------------------- | ------------------------------------------ |
| ADI Testnet                 | adi-testnet                           | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| Apechain Curtis             | apechain-testnet-curtis               | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Arc Testnet                 | arc-testnet                           | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Arbitrum Sepolia            | ethereum-testnet-sepolia-arbitrum-1   | 0xd41263567ddfead91504199b8c6c87371e83ca5d |
| Avalanche Fuji              | avalanche-testnet-fuji                | 0x2e7371a5d032489e4f60216d8d898a4c10805963 |
| Base Sepolia                | ethereum-testnet-sepolia-base-1       | 0x82300bd7c3958625581cc2f77bc6464dcecdf3e5 |
| BSC Testnet                 | binance\_smart\_chain-testnet         | 0xa238e42cb8782808dbb2f37e19859244ec4779b0 |
| Celo Sepolia                | celo-sepolia                          | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Cronos Testnet              | cronos-testnet                        | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Ethereum Hoodi Testnet      | ethereum-hoodi-testnet                | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| Ethereum Sepolia            | ethereum-testnet-sepolia              | 0x15fC6ae953E024d975e77382eEeC56A9101f9F88 |
| Gnosis Chiado               | gnosis\_chain-testnet-chiado          | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Hyperliquid Testnet         | hyperliquid-testnet                   | 0xB27fA1c28288c50542527F64BCda22C9FbAc24CB |
| Ink Sepolia                 | ink-testnet-sepolia                   | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Jovay Testnet               | jovay-testnet                         | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Linea Sepolia               | ethereum-testnet-sepolia-linea-1      | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Mantle Sepolia              | ethereum-testnet-sepolia-mantle-1     | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| MegaETH Testnet 2           | megaeth-testnet-2                     | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Monad Testnet               | monad-testnet                         | 0xB9F79d863261869B234c481D1f9A7af84AeAd192 |
| OP Sepolia                  | ethereum-testnet-sepolia-optimism-1   | 0xa2888380dff3704a8ab6d1cd1a8f69c15fea5ee3 |
| Pharos Atlantic Testnet     | pharos-atlantic-testnet               | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Plasma Testnet              | plasma-testnet                        | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Polygon Amoy                | polygon-testnet-amoy                  | 0x3675a5eb2286a3f87e8278fc66edf458a2e3bb74 |
| Robinhood Testnet           | robinhood-testnet                     | 0x0b93082D9b3C7C97fAcd250082899BAcf3af3885 |
| Scroll Sepolia (deprecated) | ethereum-testnet-sepolia-scroll-1     | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Sonic Testnet               | sonic-testnet                         | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| Stable Testnet              | stable-testnet                        | 0x9081624a30231767C3093A5F2Ae1C57A4457C88F |
| TAC Testnet                 | tac-testnet                           | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| T-REX Testnet (deprecated)  | t-rex-testnet                         | 0x53bC8B33F9Fd9cf5323b260CC078967cC3f30297 |
| Unichain Sepolia            | ethereum-testnet-sepolia-unichain-1   | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| World Chain Sepolia         | ethereum-testnet-sepolia-worldchain-1 | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| XLayer Testnet              | xlayer-testnet                        | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| ZKSync Era Sepolia          | ethereum-testnet-sepolia-zksync-1     | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |

## Production Forwarders

These `KeystoneForwarder` addresses are used by deployed workflows. Use these addresses when configuring your consumer contracts for production.

### Mainnets

| Network                                                                                                        | Chain Name                    | Forwarder Address                          |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| [ADI Mainnet](https://explorer.adifoundation.ai/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)            | adi-mainnet                   | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Arbitrum One](https://arbiscan.io/address/0xF8344CFd5c43616a4366C34E3EEE75af79a74482)                         | ethereum-mainnet-arbitrum-1   | 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 |
| [Avalanche](https://snowscan.xyz/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                           | avalanche-mainnet             | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Base](https://basescan.org/address/0xF8344CFd5c43616a4366C34E3EEE75af79a74482)                                | ethereum-mainnet-base-1       | 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 |
| [BNB Smart Chain](https://bscscan.com/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                      | binance\_smart\_chain-mainnet | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Celo](https://explorer.celo.org/mainnet/address/0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1)                   | celo-mainnet                  | 0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1 |
| [Ethereum Mainnet](https://etherscan.io/address/0x0b93082D9b3C7C97fAcd250082899BAcf3af3885)                    | ethereum-mainnet              | 0x0b93082D9b3C7C97fAcd250082899BAcf3af3885 |
| [Gnosis Chain](https://gnosisscan.io/address/0x9eF6468C5f37b976E57d52054c693269479A784d)                       | gnosis\_chain-mainnet         | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [Hyperliquid Mainnet](https://app.hyperliquid.xyz/explorer/address/0x9eF6468C5f37b976E57d52054c693269479A784d) | hyperliquid-mainnet           | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [Ink](https://explorer.inkonchain.com/address/0x9eF6468C5f37b976E57d52054c693269479A784d)                      | ethereum-mainnet-ink-1        | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [Jovay Mainnet](https://explorer.jovay.io/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                  | jovay-mainnet                 | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Linea](https://lineascan.build/address/0x9eF6468C5f37b976E57d52054c693269479A784d)                            | ethereum-mainnet-linea-1      | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [Mantle](https://mantlescan.xyz/address/0xB9F79d863261869B234c481D1f9A7af84AeAd192)                            | ethereum-mainnet-mantle-1     | 0xB9F79d863261869B234c481D1f9A7af84AeAd192 |
| [MegaETH](https://mega.etherscan.io/address/0x7BCcaFBD064cB3658476066Cc33ceE3F3414c04c)                        | megaeth-mainnet               | 0x7BCcaFBD064cB3658476066Cc33ceE3F3414c04c |
| [Monad](https://monadvision.com/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                            | monad-mainnet                 | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [OP Mainnet](https://optimistic.etherscan.io/address/0xF8344CFd5c43616a4366C34E3EEE75af79a74482)               | ethereum-mainnet-optimism-1   | 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 |
| [Pharos Mainnet](https://pharosscan.xyz/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                    | pharos-mainnet                | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Plasma](https://plasmascan.to/address/0x7BCcaFBD064cB3658476066Cc33ceE3F3414c04c)                             | plasma-mainnet                | 0x7BCcaFBD064cB3658476066Cc33ceE3F3414c04c |
| [Polygon](https://polygonscan.com/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                          | polygon-mainnet               | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Scroll](https://scrollscan.com/address/0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1)                            | ethereum-mainnet-scroll-1     | 0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1 |
| [Sonic](https://sonicscan.org/address/0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1)                              | sonic-mainnet                 | 0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1 |
| [World Chain](https://worldscan.org/address/0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1)                        | ethereum-mainnet-worldchain-1 | 0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1 |
| [XLayer Mainnet](https://www.oklink.com/xlayer/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)             | ethereum-mainnet-xlayer-1     | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [ZKSync Era](https://explorer.zksync.io/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                    | ethereum-mainnet-zksync-1     | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |

### Testnets

| Network                                                                                                              | Chain Name                            | Forwarder Address                          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| [ADI Testnet](https://explorer.testnet.adifoundation.ai/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)          | adi-testnet                           | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Apechain Curtis](https://explorer.curtis.apechain.com/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)           | apechain-testnet-curtis               | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Arc Testnet](https://testnet.arcscan.app/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                        | arc-testnet                           | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Arbitrum Sepolia](https://sepolia.arbiscan.io/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                   | ethereum-testnet-sepolia-arbitrum-1   | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Avalanche Fuji](https://testnet.snowscan.xyz/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                    | avalanche-testnet-fuji                | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Base Sepolia](https://sepolia.basescan.org/address/0xF8344CFd5c43616a4366C34E3EEE75af79a74482)                      | ethereum-testnet-sepolia-base-1       | 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 |
| [BSC Testnet](https://testnet.bscscan.com/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                        | binance\_smart\_chain-testnet         | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Celo Sepolia](https://celo-sepolia.blockscout.com/address/0x9eF6468C5f37b976E57d52054c693269479A784d)               | celo-sepolia                          | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [Cronos Testnet](https://explorer.cronos.org/testnet/address/0x9eF6468C5f37b976E57d52054c693269479A784d)             | cronos-testnet                        | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [Ethereum Hoodi Testnet](https://hoodi.etherscan.io/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)              | ethereum-hoodi-testnet                | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Ethereum Sepolia](https://sepolia.etherscan.io/address/0xF8344CFd5c43616a4366C34E3EEE75af79a74482)                  | ethereum-testnet-sepolia              | 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 |
| [Gnosis Chiado](https://gnosis-chiado.blockscout.com/address/0x0b93082D9b3C7C97fAcd250082899BAcf3af3885)             | gnosis\_chain-testnet-chiado          | 0x0b93082D9b3C7C97fAcd250082899BAcf3af3885 |
| [Hyperliquid Testnet](https://explore-testnet.hyperpc.app/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)        | hyperliquid-testnet                   | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Ink Sepolia](https://explorer-sepolia.inkonchain.com/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)            | ink-testnet-sepolia                   | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Jovay Testnet](https://sepolia-explorer.jovay.io/l2/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)             | jovay-testnet                         | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Linea Sepolia](https://sepolia.lineascan.build/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                  | ethereum-testnet-sepolia-linea-1      | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Mantle Sepolia](https://sepolia.mantlescan.xyz/address/0xB9F79d863261869B234c481D1f9A7af84AeAd192)                  | ethereum-testnet-sepolia-mantle-1     | 0xB9F79d863261869B234c481D1f9A7af84AeAd192 |
| [MegaETH Testnet 2](https://megaexplorer.xyz/address/0x9eF6468C5f37b976E57d52054c693269479A784d)                     | megaeth-testnet-2                     | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [Monad Testnet](https://testnet.monadscan.com/address/0xF8344CFd5c43616a4366C34E3EEE75af79a74482)                    | monad-testnet                         | 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 |
| [OP Sepolia](https://sepolia-optimism.etherscan.io/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)               | ethereum-testnet-sepolia-optimism-1   | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Pharos Atlantic Testnet](https://atlantic.pharosscan.xyz/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)        | pharos-atlantic-testnet               | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Plasma Testnet](https://testnet.plasmascan.to/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                   | plasma-testnet                        | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Polygon Amoy](https://amoy.polygonscan.com/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)                      | polygon-testnet-amoy                  | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [Robinhood Testnet](https://explorer.testnet.chain.robinhood.com/address/0x8E6E6A1f2B2D4dF503bfd67951CF28F27BF3AF19) | robinhood-testnet                     | 0x8E6E6A1f2B2D4dF503bfd67951CF28F27BF3AF19 |
| Scroll Sepolia (deprecated)                                                                                          | ethereum-testnet-sepolia-scroll-1     | 0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1 |
| [Sonic Testnet](https://explorer.testnet.soniclabs.com/address/0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1)           | sonic-testnet                         | 0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1 |
| [Stable Testnet](https://testnet.stablescan.xyz/address/0x701d026D1c85BA1DCbc3EEbe3636D646D88a0Aae)                  | stable-testnet                        | 0x701d026D1c85BA1DCbc3EEbe3636D646D88a0Aae |
| [TAC Testnet](https://spb.explorer.tac.build/address/0x7BCcaFBD064cB3658476066Cc33ceE3F3414c04c)                     | tac-testnet                           | 0x7BCcaFBD064cB3658476066Cc33ceE3F3414c04c |
| T-REX Testnet (deprecated)                                                                                           | t-rex-testnet                         | 0x8E6E6A1f2B2D4dF503bfd67951CF28F27BF3AF19 |
| [Unichain Sepolia](https://sepolia.uniscan.xyz/address/0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1)                   | ethereum-testnet-sepolia-unichain-1   | 0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1 |
| [World Chain Sepolia](https://sepolia.worldscan.org/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)              | ethereum-testnet-sepolia-worldchain-1 | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| [XLayer Testnet](https://www.oklink.com/xlayer-test/address/0x9eF6468C5f37b976E57d52054c693269479A784d)              | xlayer-testnet                        | 0x9eF6468C5f37b976E57d52054c693269479A784d |
| [ZKSync Era Sepolia](https://sepolia.explorer.zksync.io/address/0x76c9cf548b4179F8901cda1f8623568b58215E62)          | ethereum-testnet-sepolia-zksync-1     | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |