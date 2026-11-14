// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev QoreChain precompile: post-quantum (ML-DSA-87) key registration status of an account.
interface IPqcKeyStatus {
    function pqcKeyStatus(address account) external view returns (bool registered, uint8 algorithmId, bytes memory pubkey);
}

/// @title LeashedVault
/// @notice Treasury vault an AI operator can spend from, but only inside owner-set policy.
/// @dev Layer-2 leash. Layer-1 (protocol) is the QoreChain EVM authorization window scoped to this contract.
///      v2: every operator action also checks, on-chain via the pqcKeyStatus precompile, that the operator
///      account holds a registered post-quantum key — an operator without one can never spend.
contract LeashedVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Vendor {
        bool active;
        uint256 cap; // max per payment, token base units
        bytes32 category;
        string name;
    }

    struct Request {
        address vendor;
        uint256 amount;
        bytes32 memoHash;
        uint64 expiry;
        bool approved;
        bool executed;
    }

    IERC20 public immutable token;
    address public owner;
    address public operator;
    bool public paused;

    uint256 public perTxCap;
    uint256 public dailyCap;
    uint256 public approvalThreshold; // amounts above this need owner approval
    uint64 public requestTtl = 3 days;

    mapping(address => Vendor) public vendors;
    address[] public vendorList;
    mapping(uint256 => uint256) public daySpent; // day index => spent
    Request[] public requests;

    error NotOwner();
    error NotOperator();
    error Paused();
    error ZeroAmount();
    error VendorNotApproved(address vendor);
    error OverVendorCap(uint256 amount, uint256 cap);
    error OverPerTxCap(uint256 amount, uint256 cap);
    error OverDailyCap(uint256 wouldSpend, uint256 cap);
    error NeedsApproval(uint256 amount, uint256 threshold);
    error UnderThreshold();
    error BadRequest(uint256 id);
    error RequestExpired(uint256 id);
    error NotApproved(uint256 id);
    error AlreadyExecuted(uint256 id);

    event Paid(address indexed vendor, uint256 amount, bytes32 memoHash, uint256 requestId, address by);
    event Requested(uint256 indexed id, address indexed vendor, uint256 amount, bytes32 memoHash, uint64 expiry);
    event Approved(uint256 indexed id);
    event PolicyChanged(uint256 perTxCap, uint256 dailyCap, uint256 approvalThreshold);
    event VendorChanged(address indexed vendor, bool active, uint256 cap, bytes32 category, string name);
    event OperatorChanged(address indexed operator);
    event PausedSet(bool paused);
    event OwnershipTransferred(address indexed newOwner);

    uint256 private constant NONE = type(uint256).max;

    /// @notice QoreChain pqcKeyStatus precompile.
    address public constant PQC_KEY_STATUS = 0x0000000000000000000000000000000000000a02;

    error NoPqcKey(address account);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        if (!isPqcRegistered(msg.sender)) revert NoPqcKey(msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    constructor(IERC20 _token, address _operator, uint256 _perTxCap, uint256 _dailyCap, uint256 _approvalThreshold) {
        if (!isPqcRegistered(msg.sender)) revert NoPqcKey(msg.sender);
        if (!isPqcRegistered(_operator)) revert NoPqcKey(_operator);
        token = _token;
        owner = msg.sender;
        operator = _operator;
        _setPolicy(_perTxCap, _dailyCap, _approvalThreshold);
        emit OperatorChanged(_operator);
    }

    // ---------------- Owner ----------------

    function setPolicy(uint256 _perTxCap, uint256 _dailyCap, uint256 _approvalThreshold) external onlyOwner {
        _setPolicy(_perTxCap, _dailyCap, _approvalThreshold);
    }

    function setVendor(address vendor, bool active, uint256 cap, bytes32 category, string calldata name)
        external
        onlyOwner
    {
        if (bytes(vendors[vendor].name).length == 0 && !vendors[vendor].active) vendorList.push(vendor);
        vendors[vendor] = Vendor(active, cap, category, name);
        emit VendorChanged(vendor, active, cap, category, name);
    }

    function setOperator(address _operator) external onlyOwner {
        if (!isPqcRegistered(_operator)) revert NoPqcKey(_operator);
        operator = _operator;
        emit OperatorChanged(_operator);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    function setRequestTtl(uint64 ttl) external onlyOwner {
        requestTtl = ttl;
    }

    function approve(uint256 id) external onlyOwner {
        Request storage r = _req(id);
        if (r.executed) revert AlreadyExecuted(id);
        if (block.timestamp > r.expiry) revert RequestExpired(id);
        r.approved = true;
        emit Approved(id);
    }

    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        token.safeTransfer(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }

    // ---------------- Operator (AI agent) ----------------

    /// @notice Autonomous payment, only within every cap and at or below the approval threshold.
    function pay(address vendor, uint256 amount, bytes32 memoHash) external onlyOperator whenNotPaused nonReentrant {
        if (amount > approvalThreshold) revert NeedsApproval(amount, approvalThreshold);
        _checkAndSpend(vendor, amount);
        token.safeTransfer(vendor, amount);
        emit Paid(vendor, amount, memoHash, NONE, msg.sender);
    }

    /// @notice Ask the owner to approve a payment above the autonomous threshold.
    function request(address vendor, uint256 amount, bytes32 memoHash)
        external
        onlyOperator
        whenNotPaused
        returns (uint256 id)
    {
        if (amount == 0) revert ZeroAmount();
        if (amount <= approvalThreshold) revert UnderThreshold();
        if (!vendors[vendor].active) revert VendorNotApproved(vendor);
        id = requests.length;
        uint64 expiry = uint64(block.timestamp) + requestTtl;
        requests.push(Request(vendor, amount, memoHash, expiry, false, false));
        emit Requested(id, vendor, amount, memoHash, expiry);
    }

    /// @notice Execute an owner-approved request. Vendor + daily caps still apply; per-tx cap is waived by approval.
    function executeApproved(uint256 id) external onlyOperator whenNotPaused nonReentrant {
        Request storage r = _req(id);
        if (r.executed) revert AlreadyExecuted(id);
        if (!r.approved) revert NotApproved(id);
        if (block.timestamp > r.expiry) revert RequestExpired(id);
        r.executed = true;
        _checkVendorAndDaily(r.vendor, r.amount, false);
        token.safeTransfer(r.vendor, r.amount);
        emit Paid(r.vendor, r.amount, r.memoHash, id, msg.sender);
    }

    // ---------------- Views ----------------

    /// @notice True if `account` has a registered post-quantum key (read from the pqcKeyStatus precompile).
    /// @dev Fails closed: a failed call or malformed answer counts as "not registered".
    function isPqcRegistered(address account) public view returns (bool) {
        (bool ok, bytes memory ret) =
            PQC_KEY_STATUS.staticcall(abi.encodeCall(IPqcKeyStatus.pqcKeyStatus, (account)));
        if (!ok || ret.length < 96) return false;
        (bool registered,,) = abi.decode(ret, (bool, uint8, bytes));
        return registered;
    }

    function today() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function spentToday() external view returns (uint256) {
        return daySpent[today()];
    }

    function balance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function vendorCount() external view returns (uint256) {
        return vendorList.length;
    }

    function requestCount() external view returns (uint256) {
        return requests.length;
    }

    // ---------------- Internal ----------------

    function _setPolicy(uint256 _perTxCap, uint256 _dailyCap, uint256 _approvalThreshold) internal {
        perTxCap = _perTxCap;
        dailyCap = _dailyCap;
        approvalThreshold = _approvalThreshold;
        emit PolicyChanged(_perTxCap, _dailyCap, _approvalThreshold);
    }

    function _checkAndSpend(address vendor, uint256 amount) internal {
        if (amount > perTxCap) revert OverPerTxCap(amount, perTxCap);
        _checkVendorAndDaily(vendor, amount, true);
    }

    function _checkVendorAndDaily(address vendor, uint256 amount, bool enforceVendorCap) internal {
        if (amount == 0) revert ZeroAmount();
        Vendor storage v = vendors[vendor];
        if (!v.active) revert VendorNotApproved(vendor);
        if (enforceVendorCap && amount > v.cap) revert OverVendorCap(amount, v.cap);
        uint256 d = today();
        uint256 next = daySpent[d] + amount;
        if (next > dailyCap) revert OverDailyCap(next, dailyCap);
        daySpent[d] = next;
    }

    function _req(uint256 id) internal view returns (Request storage) {
        if (id >= requests.length) revert BadRequest(id);
        return requests[id];
    }
}
