// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PqcAttestor
/// @notice Records on-chain that an account holds a registered post-quantum (ML-DSA-87) key, by asking QoreChain's
///         PQC precompiles. Leashed uses it to attest the owner and agent accounts at deploy time.
/// @dev Uses plain CALLs (not STATICCALL) to the precompiles so the calls are visible to tracers that only follow CALL.
contract PqcAttestor {
    /// @notice QoreChain pqcKeyStatus precompile (0x0000000000000000000000000000000000000A02).
    address public immutable PQC_KEY_STATUS;
    /// @notice QoreChain pqcVerify precompile (0x0000000000000000000000000000000000000A01).
    address public immutable PQC_VERIFY;

    mapping(address => bool) public attested;

    event Attested(address indexed account, bool registered, uint8 algorithmId, uint256 pubkeyLength);
    event VerifyProbe(bool callOk, bool valid);

    constructor(address keyStatus, address verify, address[] memory accounts) {
        PQC_KEY_STATUS = keyStatus;
        PQC_VERIFY = verify;
        for (uint256 i = 0; i < accounts.length; i++) attest(accounts[i]);
        // Probe the signature-verification precompile once (empty inputs → expected "not valid").
        (bool ok, bytes memory ret) =
            verify.call(abi.encodeWithSignature("pqcVerify(bytes,bytes,bytes)", bytes(""), bytes(""), bytes("")));
        emit VerifyProbe(ok, ok && ret.length >= 32 && abi.decode(ret, (bool)));
    }

    /// @notice Ask the pqcKeyStatus precompile about `account` and record the answer.
    function attest(address account) public returns (bool registered) {
        (bool ok, bytes memory ret) = PQC_KEY_STATUS.call(abi.encodeWithSignature("pqcKeyStatus(address)", account));
        uint8 alg;
        uint256 len;
        if (ok && ret.length >= 96) {
            bytes memory pk;
            (registered, alg, pk) = abi.decode(ret, (bool, uint8, bytes));
            len = pk.length;
        }
        attested[account] = registered;
        emit Attested(account, registered, alg, len);
    }
}
