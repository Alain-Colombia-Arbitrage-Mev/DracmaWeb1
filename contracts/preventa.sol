// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IVestingVault {
    function deposit(address beneficiary, uint256 amount) external;
}

/**
 * @title FixedPricePresale
 * @dev Preventa de tokens DRACMA con fases de precio configurables.
 *      - Fase 1: precio inicial (ej. 0.20 USD) hasta priceChangeTime
 *      - Fase 2: precio secundario (ej. 0.50 USD) hasta presaleEndTime
 *      - 50% tokens entregados al instante, 50% en vesting via VestingVault
 *      - Owner puede ajustar duración, precios y fases
 */
contract FixedPricePresale is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ─── Structs ────────────────────────────────────────────────────────
    struct TokenInfo {
        address token;
        uint8 decimals;
        bool isEnabled;
        // packed in single slot: address(20) + uint8(1) + bool(1) = 22 bytes
    }

    // ─── Constants ──────────────────────────────────────────────────────
    uint256 public constant USDT_INDEX = 0;
    uint256 public constant USDC_INDEX = 1;
    uint256 public constant WBNB_INDEX = 2;

    uint256 public constant MIN_PURCHASE = 1e18;        // 1 USD min
    uint256 public constant MAX_PURCHASE = 100_000e18;  // 100,000 USD max
    uint256 private constant PRECISION = 1e18;

    // Token release: 50% instant, 50% vesting
    uint256 public constant INSTANT_RELEASE_PERCENT = 50;

    // Distribution percentages (must sum to 100)
    uint256 private constant OWNER_PERCENT    = 3;   // 3%
    uint256 private constant LIQUIDITY_PERCENT = 51;  // 51%
    uint256 private constant STAKING_PERCENT  = 18;   // 18%
    uint256 private constant ADMIN_PERCENT    = 28;   // 28%

    // ─── Immutables ─────────────────────────────────────────────────────
    IERC20 public immutable saleToken;

    // ─── State Variables (packed) ───────────────────────────────────────
    // Slot: presaleEndTime
    uint256 public presaleEndTime;
    // Slot: priceChangeTime
    uint256 public priceChangeTime;
    // Slot: currentTokenPrice
    uint256 public currentTokenPrice;
    // Slot: secondPhasePrice
    uint256 public secondPhasePrice;
    // Slot: totalTokensSold
    uint256 public totalTokensSold;

    // Slot: presaleEnded (bool = 1 byte, could pack with addresses below)
    bool public presaleEnded;

    // Vesting vault
    address public vestingVault;

    // Distribution wallets
    address public ownerWallet;
    address public liquidityWallet;
    address public stakingWallet;
    address public adminWallet;

    // Payment tokens
    mapping(uint256 => TokenInfo) public acceptedTokens;

    // ─── Events ─────────────────────────────────────────────────────────
    event TokensPurchased(
        address indexed buyer,
        uint256 indexed tokenIndex,
        uint256 paymentAmount,
        uint256 tokenAmount
    );
    event FundsDistributed(
        uint256 ownerAmount,
        uint256 liquidityAmount,
        uint256 stakingAmount,
        uint256 adminAmount
    );
    event PresaleEnded(uint256 totalSold, uint256 endTime);
    event TokenStatusUpdated(uint256 indexed tokenIndex, bool isEnabled);
    event DistributionWalletsUpdated(
        address ownerWallet,
        address liquidityWallet,
        address stakingWallet,
        address adminWallet
    );
    event TokenPriceUpdated(uint256 newPrice);
    event SecondPhasePriceUpdated(uint256 newPrice);
    event PresaleEndTimeUpdated(uint256 newEndTime);
    event PriceChangeTimeUpdated(uint256 newChangeTime);
    event VestingVaultUpdated(address newVault);

    // ─── Custom Errors (cheaper than string reverts) ────────────────────
    error PresaleHasEnded();
    error PresaleTimeExpired();
    error InvalidTokenIndex();
    error TokenNotAccepted();
    error BelowMinimumPurchase();
    error ExceedsMaximumPurchase();
    error InsufficientSaleTokens();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidTime();
    error PresaleNotEnded();
    error NothingToWithdraw();
    error VaultNotSet();

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier validTokenIndex(uint256 tokenIndex) {
        if (tokenIndex > WBNB_INDEX) revert InvalidTokenIndex();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(
        address _saleToken,
        address _usdt,
        address _usdc,
        address _wbnb,
        address _ownerWallet,
        address _liquidityWallet,
        address _stakingWallet,
        address _adminWallet,
        uint256 _initialPrice,
        uint256 _secondPhasePrice,
        uint256 _presaleDurationDays,
        uint256 _priceChangeDays
    ) Ownable(msg.sender) {
        if (_saleToken == address(0)) revert InvalidAddress();
        if (_usdt == address(0) || _usdc == address(0) || _wbnb == address(0)) revert InvalidAddress();
        if (_ownerWallet == address(0) || _liquidityWallet == address(0)) revert InvalidAddress();
        if (_stakingWallet == address(0) || _adminWallet == address(0)) revert InvalidAddress();
        if (_initialPrice == 0 || _secondPhasePrice == 0) revert InvalidPrice();
        if (_presaleDurationDays == 0 || _priceChangeDays > _presaleDurationDays) revert InvalidTime();

        saleToken = IERC20(_saleToken);

        ownerWallet = _ownerWallet;
        liquidityWallet = _liquidityWallet;
        stakingWallet = _stakingWallet;
        adminWallet = _adminWallet;

        currentTokenPrice = _initialPrice;
        secondPhasePrice = _secondPhasePrice;

        uint256 timestamp = block.timestamp;
        presaleEndTime = timestamp + (_presaleDurationDays * 86400);
        priceChangeTime = timestamp + (_priceChangeDays * 86400);

        // Store minimal token info (no symbol string - saves gas)
        acceptedTokens[USDT_INDEX] = TokenInfo({
            token: _usdt,
            decimals: _getDecimals(_usdt),
            isEnabled: true
        });

        acceptedTokens[USDC_INDEX] = TokenInfo({
            token: _usdc,
            decimals: _getDecimals(_usdc),
            isEnabled: true
        });

        acceptedTokens[WBNB_INDEX] = TokenInfo({
            token: _wbnb,
            decimals: _getDecimals(_wbnb),
            isEnabled: true
        });
    }

    // ─── Core Functions ─────────────────────────────────────────────────

    /**
     * @dev Compra tokens con USDT, USDC o WBNB.
     * @param tokenIndex 0 = USDT, 1 = USDC, 2 = WBNB
     * @param amount Monto en wei del token de pago
     */
    function buyTokens(uint256 tokenIndex, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        validTokenIndex(tokenIndex)
    {
        if (presaleEnded) revert PresaleHasEnded();
        if (block.timestamp >= presaleEndTime) revert PresaleTimeExpired();

        TokenInfo storage info = acceptedTokens[tokenIndex];
        if (!info.isEnabled) revert TokenNotAccepted();

        // Validar montos
        if (amount < MIN_PURCHASE) revert BelowMinimumPurchase();
        if (amount > MAX_PURCHASE) revert ExceedsMaximumPurchase();

        // Auto-update precio si pasamos la fecha de cambio
        _checkPricePhase();

        // Verificar que el vault está configurado
        address vault = vestingVault;
        if (vault == address(0)) revert VaultNotSet();

        // Calcular tokens a recibir
        uint256 tokenAmount = _calculateTokens(amount);
        if (saleToken.balanceOf(address(this)) < tokenAmount) revert InsufficientSaleTokens();

        // Transferir pago del comprador al contrato
        address paymentToken = info.token;
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);

        // Split: 50% instant, 50% vesting
        uint256 instantAmount;
        uint256 vestingAmount;
        unchecked {
            instantAmount = (tokenAmount * INSTANT_RELEASE_PERCENT) / 100;
            vestingAmount = tokenAmount - instantAmount;
        }

        // Enviar 50% al comprador directamente
        saleToken.safeTransfer(msg.sender, instantAmount);

        // Enviar 50% al vault y registrar el vesting
        saleToken.safeTransfer(vault, vestingAmount);
        IVestingVault(vault).deposit(msg.sender, vestingAmount);

        // Actualizar total vendido
        unchecked {
            totalTokensSold += tokenAmount;
        }

        // Distribuir fondos a las wallets
        _distributeFunds(paymentToken, amount);

        emit TokensPurchased(msg.sender, tokenIndex, amount, tokenAmount);
    }

    /**
     * @dev Calcula tokens a recibir: tokenAmount = paymentAmount / price * 1e18
     *      Ejemplo: 100 USDT a precio 0.10 = 100 / 0.10 = 1000 tokens
     */
    function calculateTokenAmount(uint256 amount) external view returns (uint256) {
        return _calculateTokens(amount);
    }

    /**
     * @dev Retorna el precio actual basado en la fase
     */
    function getCurrentPrice() public view returns (uint256) {
        if (block.timestamp >= priceChangeTime) {
            return secondPhasePrice;
        }
        return currentTokenPrice;
    }

    /**
     * @dev Valida si un monto de compra es válido
     */
    function validatePurchaseAmount(uint256 amount)
        external
        pure
        returns (bool isValid, string memory reason)
    {
        if (amount < MIN_PURCHASE) {
            return (false, "Below minimum purchase (1 USD)");
        }
        if (amount > MAX_PURCHASE) {
            return (false, "Exceeds maximum purchase");
        }
        return (true, "");
    }

    /**
     * @dev Estado completo de la preventa
     */
    function getPresaleStatus()
        external
        view
        returns (
            uint256 tokensSold,
            uint256 tokensAvailable,
            uint256 timeRemaining,
            bool isEnded,
            uint256 currentTime,
            uint256 currentPrice
        )
    {
        uint256 ts = block.timestamp;
        return (
            totalTokensSold,
            saleToken.balanceOf(address(this)),
            ts < presaleEndTime ? presaleEndTime - ts : 0,
            presaleEnded,
            ts,
            getCurrentPrice()
        );
    }

    // ─── Admin: Precio ──────────────────────────────────────────────────

    /**
     * @dev Actualiza el precio de fase 1 (precio actual si estamos en fase 1)
     */
    function updateTokenPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert InvalidPrice();
        currentTokenPrice = newPrice;
        emit TokenPriceUpdated(newPrice);
    }

    /**
     * @dev Actualiza el precio de fase 2
     */
    function updateSecondPhasePrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert InvalidPrice();
        secondPhasePrice = newPrice;
        emit SecondPhasePriceUpdated(newPrice);
    }

    // ─── Admin: Duración ────────────────────────────────────────────────

    /**
     * @dev Extiende o acorta la duración de la preventa.
     *      El nuevo tiempo debe ser en el futuro.
     */
    function updatePresaleEndTime(uint256 newEndTime) external onlyOwner {
        if (newEndTime <= block.timestamp) revert InvalidTime();
        presaleEndTime = newEndTime;
        emit PresaleEndTimeUpdated(newEndTime);
    }

    /**
     * @dev Cambia el momento en que se activa el precio de fase 2.
     *      Debe ser antes del fin de la preventa.
     */
    function updatePriceChangeTime(uint256 newChangeTime) external onlyOwner {
        if (newChangeTime <= block.timestamp) revert InvalidTime();
        priceChangeTime = newChangeTime;
        emit PriceChangeTimeUpdated(newChangeTime);
    }

    // ─── Admin: Tokens y Wallets ────────────────────────────────────────

    function toggleToken(uint256 tokenIndex, bool enabled)
        external
        onlyOwner
        validTokenIndex(tokenIndex)
    {
        acceptedTokens[tokenIndex].isEnabled = enabled;
        emit TokenStatusUpdated(tokenIndex, enabled);
    }

    function updateDistributionWallets(
        address _ownerWallet,
        address _liquidityWallet,
        address _stakingWallet,
        address _adminWallet
    ) external onlyOwner {
        if (_ownerWallet == address(0) || _liquidityWallet == address(0)) revert InvalidAddress();
        if (_stakingWallet == address(0) || _adminWallet == address(0)) revert InvalidAddress();

        ownerWallet = _ownerWallet;
        liquidityWallet = _liquidityWallet;
        stakingWallet = _stakingWallet;
        adminWallet = _adminWallet;

        emit DistributionWalletsUpdated(_ownerWallet, _liquidityWallet, _stakingWallet, _adminWallet);
    }

    // ─── Admin: Control ─────────────────────────────────────────────────

    function endPresale() external onlyOwner {
        if (presaleEnded) revert PresaleHasEnded();
        presaleEnded = true;
        emit PresaleEnded(totalTokensSold, block.timestamp);
    }

    function withdrawUnsoldTokens() external onlyOwner {
        if (!presaleEnded) revert PresaleNotEnded();
        uint256 balance = saleToken.balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();
        saleToken.safeTransfer(owner(), balance);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Configura la dirección del VestingVault. Debe llamarse antes de la primera compra.
     */
    function setVestingVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert InvalidAddress();
        vestingVault = _vault;
        emit VestingVaultUpdated(_vault);
    }

    function rescueTokens(address tokenAddress, uint256 amount) external onlyOwner {
        if (tokenAddress == address(saleToken)) revert InvalidAddress();
        if (tokenAddress == acceptedTokens[USDT_INDEX].token) revert InvalidAddress();
        if (tokenAddress == acceptedTokens[USDC_INDEX].token) revert InvalidAddress();
        if (tokenAddress == acceptedTokens[WBNB_INDEX].token) revert InvalidAddress();

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance < amount) revert InvalidAmount();

        token.safeTransfer(owner(), amount);
    }

    // ─── Internal ───────────────────────────────────────────────────────

    /**
     * @dev Formula correcta: tokens = (amount * PRECISION) / price
     *      100 USDT a 0.20 USD → (100e18 * 1e18) / 0.2e18 = 500e18 tokens
     */
    function _calculateTokens(uint256 amount) internal view returns (uint256) {
        uint256 price = getCurrentPrice();
        return (amount * PRECISION) / price;
    }

    /**
     * @dev Auto-update de precio cuando pasamos la fecha de cambio de fase
     */
    function _checkPricePhase() internal {
        if (block.timestamp >= priceChangeTime && currentTokenPrice != secondPhasePrice) {
            currentTokenPrice = secondPhasePrice;
            emit TokenPriceUpdated(secondPhasePrice);
        }
    }

    /**
     * @dev Distribuye fondos directamente sin array intermedio (ahorra gas)
     */
    function _distributeFunds(address paymentToken, uint256 amount) internal {
        IERC20 token = IERC20(paymentToken);

        uint256 ownerAmt;
        uint256 liquidityAmt;
        uint256 stakingAmt;
        uint256 adminAmt;

        unchecked {
            ownerAmt    = (amount * OWNER_PERCENT) / 100;
            liquidityAmt = (amount * LIQUIDITY_PERCENT) / 100;
            stakingAmt  = (amount * STAKING_PERCENT) / 100;
            adminAmt    = (amount * ADMIN_PERCENT) / 100;
        }

        token.safeTransfer(ownerWallet, ownerAmt);
        token.safeTransfer(liquidityWallet, liquidityAmt);
        token.safeTransfer(stakingWallet, stakingAmt);
        token.safeTransfer(adminWallet, adminAmt);

        emit FundsDistributed(ownerAmt, liquidityAmt, stakingAmt, adminAmt);
    }

    /**
     * @dev Helper para obtener decimales de un token ERC20
     */
    function _getDecimals(address token) internal view returns (uint8) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("decimals()")
        );
        if (success && data.length >= 32) {
            return abi.decode(data, (uint8));
        }
        return 18; // default
    }

    // ─── Fallback ───────────────────────────────────────────────────────

    receive() external payable {
        revert InvalidAmount();
    }

    fallback() external {
        revert InvalidAmount();
    }
}
