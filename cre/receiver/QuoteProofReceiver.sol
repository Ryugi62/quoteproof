// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// SPEC §12·§13 — receiver for the QuoteProof CRE workflow's EVM report. Stores and emits only the verdict and the receipt hash
// (no brief text, no opinion text). v4: the constructor pins the CRE forwarder; onReport accepts calls from that address only.
interface IERC165 { function supportsInterface(bytes4 interfaceId) external view returns (bool); }
interface IReceiver is IERC165 { function onReport(bytes calldata metadata, bytes calldata report) external; }

contract QuoteProofReceiver is IReceiver {
    error NotForwarder(address caller);
    error ZeroForwarder();

    event QuoteVerdict(bytes32 indexed receiptHash, uint8 verdictCode, string reasons);
    address public immutable forwarder;           // Chainlink CRE (mock) forwarder allowed to call onReport
    mapping(bytes32 => uint8) public verdictOf;   // 1 = PASS, 0 = HOLD (only meaningful when seen[hash])
    mapping(bytes32 => bool) public seen;

    constructor(address forwarder_) {
        if (forwarder_ == address(0)) revert ZeroForwarder();
        forwarder = forwarder_;
    }

    function onReport(bytes calldata, bytes calldata report) external override {
        if (msg.sender != forwarder) revert NotForwarder(msg.sender);
        (bytes32 receiptHash, uint8 verdictCode, string memory reasons) = abi.decode(report, (bytes32, uint8, string));
        seen[receiptHash] = true;
        verdictOf[receiptHash] = verdictCode;
        emit QuoteVerdict(receiptHash, verdictCode, reasons);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
