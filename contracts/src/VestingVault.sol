// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VestingVault
 * @dev Almacena tokens de preventa con vesting lineal.
 *      - Solo la preventa puede depositar (via deposit())
 *      - Los usuarios reclaman tokens desbloqueados via claim()
 *      - Vesting lineal desde vestingStart hasta vestingStart + vestingDuration
 */
contract VestingVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── State ──────────────────────────────────────────────────────────
    IERC20 public immutable token;
    address public presaleContract;

    uint256 public vestingStart;
    uint256 public vestingDuration; // seconds

    struct VestingInfo {
        uint256 totalAmount;   // total tokens locked for this user
        uint256 claimed;       // tokens already claimed
    }

    mapping(address => VestingInfo) public vestings;

    uint256 public totalDeposited;
    uint256 public totalClaimed;

    // ─── Events ─────────────────────────────────────────────────────────
    event Deposited(address indexed beneficiary, uint256 amount);
    event Claimed(address indexed beneficiary, uint256 amount);
    event VestingStartUpdated(uint256 newStart);
    event VestingDurationUpdated(uint256 newDuration);
    event PresaleContractUpdated(address newPresale);

    // ─── Errors ─────────────────────────────────────────────────────────
    error OnlyPresale();
    error VestingNotStarted();
    error NothingToClaim();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidTime();

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlyPresale() {
        if (msg.sender != presaleContract) revert OnlyPresale();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(
        address _token,
        address _presaleContract,
        uint256 _vestingStartTimestamp,
        uint256 _vestingDurationDays
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert InvalidAddress();
        if (_presaleContract == address(0)) revert InvalidAddress();
        if (_vestingDurationDays == 0) revert InvalidTime();

        token = IERC20(_token);
        presaleContract = _presaleContract;
        vestingStart = _vestingStartTimestamp;
        vestingDuration = _vestingDurationDays * 86400;
    }

    // ─── Core ───────────────────────────────────────────────────────────

    /**
     * @dev Called by presale contract to lock tokens for a buyer.
     *      Tokens must already be transferred to this vault before calling.
     */
    function deposit(address beneficiary, uint256 amount) external onlyPresale {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        vestings[beneficiary].totalAmount += amount;
        totalDeposited += amount;

        emit Deposited(beneficiary, amount);
    }

    /**
     * @dev Users call this to claim their unlocked tokens.
     */
    function claim() external nonReentrant {
        if (block.timestamp < vestingStart) revert VestingNotStarted();

        uint256 claimable = getClaimable(msg.sender);
        if (claimable == 0) revert NothingToClaim();

        vestings[msg.sender].claimed += claimable;
        totalClaimed += claimable;

        token.safeTransfer(msg.sender, claimable);

        emit Claimed(msg.sender, claimable);
    }

    // ─── View ───────────────────────────────────────────────────────────

    /**
     * @dev Returns total tokens unlocked so far for a user (vested - claimed).
     */
    function getClaimable(address user) public view returns (uint256) {
        VestingInfo storage info = vestings[user];
        if (info.totalAmount == 0) return 0;

        uint256 vested = getVestedAmount(user);
        return vested - info.claimed;
    }

    /**
     * @dev Returns total vested (unlocked) amount based on time elapsed.
     *      Linear vesting: vestedAmount = totalAmount * elapsed / duration
     */
    function getVestedAmount(address user) public view returns (uint256) {
        VestingInfo storage info = vestings[user];
        if (info.totalAmount == 0) return 0;
        if (block.timestamp < vestingStart) return 0;

        uint256 elapsed = block.timestamp - vestingStart;
        if (elapsed >= vestingDuration) {
            return info.totalAmount; // fully vested
        }

        return (info.totalAmount * elapsed) / vestingDuration;
    }

    /**
     * @dev Full vesting info for a user (for frontend).
     */
    function getUserVesting(address user)
        external
        view
        returns (
            uint256 total,
            uint256 vested,
            uint256 claimed,
            uint256 claimable,
            uint256 remaining
        )
    {
        VestingInfo storage info = vestings[user];
        uint256 _vested = getVestedAmount(user);
        uint256 _claimable = _vested > info.claimed ? _vested - info.claimed : 0;

        return (
            info.totalAmount,
            _vested,
            info.claimed,
            _claimable,
            info.totalAmount - info.claimed
        );
    }

    // ─── Admin ──────────────────────────────────────────────────────────

    /**
     * @dev Update vesting start time (only before vesting has started).
     */
    function updateVestingStart(uint256 newStart) external onlyOwner {
        if (block.timestamp >= vestingStart) revert InvalidTime();
        vestingStart = newStart;
        emit VestingStartUpdated(newStart);
    }

    /**
     * @dev Update vesting duration (only before vesting has started).
     */
    function updateVestingDuration(uint256 newDurationDays) external onlyOwner {
        if (block.timestamp >= vestingStart) revert InvalidTime();
        if (newDurationDays == 0) revert InvalidTime();
        vestingDuration = newDurationDays * 86400;
        emit VestingDurationUpdated(newDurationDays);
    }

    /**
     * @dev Update presale contract address.
     */
    function updatePresaleContract(address newPresale) external onlyOwner {
        if (newPresale == address(0)) revert InvalidAddress();
        presaleContract = newPresale;
        emit PresaleContractUpdated(newPresale);
    }
}
