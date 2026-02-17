// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DracmaStaking
 * @dev Staking de tokens DRACMA con APR fijo configurable.
 *      - Usuarios depositan DRACMA y ganan recompensas en DRACMA
 *      - APR en basis points (1000 = 10%)
 *      - Reward pool financiado por owner
 *      - Recompensas: (staked * apr * elapsed) / (365 days * 10000)
 */
contract DracmaStaking is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ─── Structs ────────────────────────────────────────────────────────
    struct StakeInfo {
        uint256 amount;          // tokens staked
        uint256 rewardDebt;      // rewards acumuladas pendientes
        uint256 lastClaimTime;   // último momento de cálculo de rewards
    }

    // ─── Constants ──────────────────────────────────────────────────────
    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    // ─── Immutables ─────────────────────────────────────────────────────
    IERC20 public immutable stakingToken;

    // ─── State Variables ────────────────────────────────────────────────
    uint256 public aprBasisPoints;      // 1000 = 10%
    uint256 public totalStaked;
    uint256 public rewardPoolBalance;   // tokens depositados por owner para recompensas

    mapping(address => StakeInfo) public stakers;

    // ─── Events ─────────────────────────────────────────────────────────
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardPoolFunded(uint256 amount);
    event RewardPoolWithdrawn(uint256 amount);
    event AprUpdated(uint256 newAprBasisPoints);

    // ─── Custom Errors ──────────────────────────────────────────────────
    error InvalidAmount();
    error InvalidAddress();
    error NothingStaked();
    error NothingToClaim();
    error InsufficientRewardPool();
    error InvalidApr();

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(
        address _stakingToken,
        uint256 _initialAprBasisPoints
    ) Ownable(msg.sender) {
        if (_stakingToken == address(0)) revert InvalidAddress();
        if (_initialAprBasisPoints == 0 || _initialAprBasisPoints > BASIS_POINTS)
            revert InvalidApr();

        stakingToken = IERC20(_stakingToken);
        aprBasisPoints = _initialAprBasisPoints;
    }

    // ─── Core Functions ─────────────────────────────────────────────────

    /**
     * @dev Stake tokens DRACMA. Requiere aprobación previa.
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        StakeInfo storage info = stakers[msg.sender];

        // Si ya tiene stake, acumular rewards pendientes
        if (info.amount > 0) {
            uint256 pending = _pendingRewards(msg.sender);
            if (pending > 0) {
                info.rewardDebt += pending;
            }
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        info.amount += amount;
        info.lastClaimTime = block.timestamp;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Retirar tokens total o parcialmente. Auto-reclama rewards pendientes.
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakers[msg.sender];
        if (info.amount == 0) revert NothingStaked();
        if (amount == 0 || amount > info.amount) revert InvalidAmount();

        // Calcular y pagar rewards pendientes
        uint256 pending = _pendingRewards(msg.sender) + info.rewardDebt;
        info.rewardDebt = 0;

        if (pending > 0 && pending <= rewardPoolBalance) {
            rewardPoolBalance -= pending;
            stakingToken.safeTransfer(msg.sender, pending);
            emit RewardsClaimed(msg.sender, pending);
        }

        info.amount -= amount;
        info.lastClaimTime = block.timestamp;
        totalStaked -= amount;

        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Reclamar rewards sin retirar el stake.
     */
    function claimRewards() external nonReentrant {
        StakeInfo storage info = stakers[msg.sender];
        if (info.amount == 0) revert NothingStaked();

        uint256 pending = _pendingRewards(msg.sender) + info.rewardDebt;
        if (pending == 0) revert NothingToClaim();
        if (pending > rewardPoolBalance) revert InsufficientRewardPool();

        info.rewardDebt = 0;
        info.lastClaimTime = block.timestamp;
        rewardPoolBalance -= pending;

        stakingToken.safeTransfer(msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending);
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /**
     * @dev Info de staking para el frontend.
     */
    function getUserStake(address user)
        external
        view
        returns (
            uint256 stakedAmount,
            uint256 pendingRewards,
            uint256 lastClaimTime
        )
    {
        StakeInfo storage info = stakers[user];
        return (
            info.amount,
            _pendingRewards(user) + info.rewardDebt,
            info.lastClaimTime
        );
    }

    // ─── Admin Functions ────────────────────────────────────────────────

    /**
     * @dev Owner deposita DRACMA para financiar el pool de recompensas.
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPoolBalance += amount;
        emit RewardPoolFunded(amount);
    }

    /**
     * @dev Owner retira tokens excedentes del pool de recompensas.
     */
    function withdrawRewardPool(uint256 amount) external onlyOwner {
        if (amount == 0 || amount > rewardPoolBalance) revert InvalidAmount();
        rewardPoolBalance -= amount;
        stakingToken.safeTransfer(owner(), amount);
        emit RewardPoolWithdrawn(amount);
    }

    /**
     * @dev Actualizar APR (en basis points). 1000 = 10%.
     */
    function updateApr(uint256 newAprBasisPoints) external onlyOwner {
        if (newAprBasisPoints == 0 || newAprBasisPoints > BASIS_POINTS)
            revert InvalidApr();
        aprBasisPoints = newAprBasisPoints;
        emit AprUpdated(newAprBasisPoints);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Rescatar tokens ERC20 enviados por error (no permite el token de staking).
     */
    function rescueTokens(address tokenAddress, uint256 amount) external onlyOwner {
        if (tokenAddress == address(stakingToken)) revert InvalidAddress();
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance < amount) revert InvalidAmount();
        token.safeTransfer(owner(), amount);
    }

    // ─── Internal ───────────────────────────────────────────────────────

    /**
     * @dev Calcula rewards pendientes desde el último claim.
     *      Formula: (stakedAmount * aprBasisPoints * elapsed) / (SECONDS_PER_YEAR * BASIS_POINTS)
     */
    function _pendingRewards(address user) internal view returns (uint256) {
        StakeInfo storage info = stakers[user];
        if (info.amount == 0 || info.lastClaimTime == 0) return 0;

        uint256 elapsed = block.timestamp - info.lastClaimTime;
        return (info.amount * aprBasisPoints * elapsed) / (SECONDS_PER_YEAR * BASIS_POINTS);
    }

    // ─── Fallback ───────────────────────────────────────────────────────

    receive() external payable {
        revert InvalidAmount();
    }

    fallback() external {
        revert InvalidAmount();
    }
}
