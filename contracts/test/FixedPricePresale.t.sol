// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/FixedPricePresale.sol";
import "../src/VestingVault.sol";
import "../src/mocks/MockERC20.sol";

contract FixedPricePresaleTest is Test {
    FixedPricePresale public presale;
    VestingVault public vault;
    MockERC20 public saleToken;
    MockERC20 public usdt;
    MockERC20 public usdc;
    MockERC20 public wbnb;

    address owner = address(this);
    address buyer = address(0xBEEF);
    address buyer2 = address(0xCAFE);
    address ownerWallet = address(0x1);
    address liquidityWallet = address(0x2);
    address stakingWallet = address(0x3);
    address adminWallet = address(0x4);

    uint256 constant INITIAL_PRICE = 0.2e18;      // $0.20
    uint256 constant SECOND_PRICE = 0.5e18;        // $0.50
    uint256 constant PRESALE_DAYS = 120;
    uint256 constant PRICE_CHANGE_DAYS = 30;
    uint256 constant VESTING_DURATION_DAYS = 180;  // 6 months
    uint256 constant SALE_TOKEN_SUPPLY = 400_000_000e18;

    function setUp() public {
        // Deploy mock tokens
        saleToken = new MockERC20("DRACMA", "DRC", 18);
        usdt = new MockERC20("Tether", "USDT", 18);
        usdc = new MockERC20("USD Coin", "USDC", 18);
        wbnb = new MockERC20("Wrapped BNB", "WBNB", 18);

        // Deploy presale
        presale = new FixedPricePresale(
            address(saleToken),
            address(usdt),
            address(usdc),
            address(wbnb),
            ownerWallet,
            liquidityWallet,
            stakingWallet,
            adminWallet,
            INITIAL_PRICE,
            SECOND_PRICE,
            PRESALE_DAYS,
            PRICE_CHANGE_DAYS
        );

        // Deploy vesting vault (vesting starts when presale ends)
        uint256 vestingStart = block.timestamp + (PRESALE_DAYS * 86400);
        vault = new VestingVault(
            address(saleToken),
            address(presale),
            vestingStart,
            VESTING_DURATION_DAYS
        );

        // Set vault on presale
        presale.setVestingVault(address(vault));

        // Fund presale with sale tokens
        saleToken.mint(address(presale), SALE_TOKEN_SUPPLY);

        // Fund buyers with payment tokens
        usdt.mint(buyer, 1_000_000e18);
        usdc.mint(buyer, 1_000_000e18);
        wbnb.mint(buyer, 10_000e18);
        usdt.mint(buyer2, 1_000_000e18);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRESALE TESTS
    // ═══════════════════════════════════════════════════════════════════

    // ─── Constructor Tests ──────────────────────────────────────────────

    function test_constructor_setsCorrectValues() public view {
        assertEq(presale.currentTokenPrice(), INITIAL_PRICE);
        assertEq(presale.secondPhasePrice(), SECOND_PRICE);
        assertEq(presale.presaleEnded(), false);
        assertEq(presale.totalTokensSold(), 0);
        assertEq(presale.USDT_INDEX(), 0);
        assertEq(presale.USDC_INDEX(), 1);
        assertEq(presale.WBNB_INDEX(), 2);
        assertEq(presale.INSTANT_RELEASE_PERCENT(), 50);
    }

    function test_constructor_setsEndTime() public view {
        uint256 expectedEnd = block.timestamp + (PRESALE_DAYS * 86400);
        assertEq(presale.presaleEndTime(), expectedEnd);
    }

    function test_constructor_setsPriceChangeTime() public view {
        uint256 expectedChange = block.timestamp + (PRICE_CHANGE_DAYS * 86400);
        assertEq(presale.priceChangeTime(), expectedChange);
    }

    function test_constructor_acceptedTokens() public view {
        (address token, uint8 decimals, bool isEnabled) = presale.acceptedTokens(0);
        assertEq(token, address(usdt));
        assertEq(decimals, 18);
        assertTrue(isEnabled);

        (token, decimals, isEnabled) = presale.acceptedTokens(1);
        assertEq(token, address(usdc));
        assertEq(decimals, 18);
        assertTrue(isEnabled);

        (token, decimals, isEnabled) = presale.acceptedTokens(2);
        assertEq(token, address(wbnb));
        assertEq(decimals, 18);
        assertTrue(isEnabled);
    }

    function test_constructor_revertsZeroSaleToken() public {
        vm.expectRevert(FixedPricePresale.InvalidAddress.selector);
        new FixedPricePresale(
            address(0), address(usdt), address(usdc), address(wbnb),
            ownerWallet, liquidityWallet, stakingWallet, adminWallet,
            INITIAL_PRICE, SECOND_PRICE, PRESALE_DAYS, PRICE_CHANGE_DAYS
        );
    }

    function test_constructor_revertsZeroPrice() public {
        vm.expectRevert(FixedPricePresale.InvalidPrice.selector);
        new FixedPricePresale(
            address(saleToken), address(usdt), address(usdc), address(wbnb),
            ownerWallet, liquidityWallet, stakingWallet, adminWallet,
            0, SECOND_PRICE, PRESALE_DAYS, PRICE_CHANGE_DAYS
        );
    }

    function test_constructor_revertsPriceChangeDaysExceedsDuration() public {
        vm.expectRevert(FixedPricePresale.InvalidTime.selector);
        new FixedPricePresale(
            address(saleToken), address(usdt), address(usdc), address(wbnb),
            ownerWallet, liquidityWallet, stakingWallet, adminWallet,
            INITIAL_PRICE, SECOND_PRICE, 30, 60
        );
    }

    // ─── Buy Tokens: 50/50 Split ────────────────────────────────────────

    function test_buyTokens_splits50_50() public {
        uint256 amount = 100e18; // 100 USDT
        uint256 totalTokens = (amount * 1e18) / INITIAL_PRICE; // 500 tokens
        uint256 instantTokens = totalTokens / 2; // 250
        uint256 vestingTokens = totalTokens - instantTokens; // 250

        vm.startPrank(buyer);
        usdt.approve(address(presale), amount);
        presale.buyTokens(0, amount);
        vm.stopPrank();

        // Buyer gets 50% instantly
        assertEq(saleToken.balanceOf(buyer), instantTokens);
        // Vault holds 50%
        assertEq(saleToken.balanceOf(address(vault)), vestingTokens);
        // Vault records the vesting
        (uint256 total, , , , ) = vault.getUserVesting(buyer);
        assertEq(total, vestingTokens);
        // Total sold includes all
        assertEq(presale.totalTokensSold(), totalTokens);
    }

    function test_buyTokens_withUSDC_splits() public {
        uint256 amount = 200e18;
        uint256 totalTokens = (amount * 1e18) / INITIAL_PRICE;

        vm.startPrank(buyer);
        usdc.approve(address(presale), amount);
        presale.buyTokens(1, amount);
        vm.stopPrank();

        assertEq(saleToken.balanceOf(buyer), totalTokens / 2);
    }

    function test_buyTokens_withWBNB_splits() public {
        uint256 amount = 10e18;
        uint256 totalTokens = (amount * 1e18) / INITIAL_PRICE;

        vm.startPrank(buyer);
        wbnb.approve(address(presale), amount);
        presale.buyTokens(2, amount);
        vm.stopPrank();

        assertEq(saleToken.balanceOf(buyer), totalTokens / 2);
    }

    function test_buyTokens_distributeFunds() public {
        uint256 amount = 1000e18;

        vm.startPrank(buyer);
        usdt.approve(address(presale), amount);
        presale.buyTokens(0, amount);
        vm.stopPrank();

        assertEq(usdt.balanceOf(ownerWallet), (amount * 3) / 100);
        assertEq(usdt.balanceOf(liquidityWallet), (amount * 51) / 100);
        assertEq(usdt.balanceOf(stakingWallet), (amount * 18) / 100);
        assertEq(usdt.balanceOf(adminWallet), (amount * 28) / 100);
    }

    function test_buyTokens_revertsWithoutVault() public {
        // Deploy new presale without vault
        FixedPricePresale noVaultPresale = new FixedPricePresale(
            address(saleToken), address(usdt), address(usdc), address(wbnb),
            ownerWallet, liquidityWallet, stakingWallet, adminWallet,
            INITIAL_PRICE, SECOND_PRICE, PRESALE_DAYS, PRICE_CHANGE_DAYS
        );
        saleToken.mint(address(noVaultPresale), 1_000_000e18);

        vm.startPrank(buyer);
        usdt.approve(address(noVaultPresale), 10e18);
        vm.expectRevert(FixedPricePresale.VaultNotSet.selector);
        noVaultPresale.buyTokens(0, 10e18);
        vm.stopPrank();
    }

    function test_buyTokens_revertsBelowMinimum() public {
        vm.startPrank(buyer);
        usdt.approve(address(presale), 0.5e18);
        vm.expectRevert(FixedPricePresale.BelowMinimumPurchase.selector);
        presale.buyTokens(0, 0.5e18);
        vm.stopPrank();
    }

    function test_buyTokens_revertsAboveMaximum() public {
        uint256 amount = 100_001e18;
        usdt.mint(buyer, amount);

        vm.startPrank(buyer);
        usdt.approve(address(presale), amount);
        vm.expectRevert(FixedPricePresale.ExceedsMaximumPurchase.selector);
        presale.buyTokens(0, amount);
        vm.stopPrank();
    }

    function test_buyTokens_revertsWhenEnded() public {
        presale.endPresale();

        vm.startPrank(buyer);
        usdt.approve(address(presale), 10e18);
        vm.expectRevert(FixedPricePresale.PresaleHasEnded.selector);
        presale.buyTokens(0, 10e18);
        vm.stopPrank();
    }

    function test_buyTokens_revertsWhenTimeExpired() public {
        vm.warp(block.timestamp + (PRESALE_DAYS * 86400) + 1);

        vm.startPrank(buyer);
        usdt.approve(address(presale), 10e18);
        vm.expectRevert(FixedPricePresale.PresaleTimeExpired.selector);
        presale.buyTokens(0, 10e18);
        vm.stopPrank();
    }

    function test_buyTokens_revertsDisabledToken() public {
        presale.toggleToken(1, false);

        vm.startPrank(buyer);
        usdc.approve(address(presale), 10e18);
        vm.expectRevert(FixedPricePresale.TokenNotAccepted.selector);
        presale.buyTokens(1, 10e18);
        vm.stopPrank();
    }

    function test_buyTokens_revertsInvalidTokenIndex() public {
        vm.startPrank(buyer);
        vm.expectRevert(FixedPricePresale.InvalidTokenIndex.selector);
        presale.buyTokens(3, 10e18);
        vm.stopPrank();
    }

    function test_buyTokens_revertsWhenPaused() public {
        presale.pause();

        vm.startPrank(buyer);
        usdt.approve(address(presale), 10e18);
        vm.expectRevert();
        presale.buyTokens(0, 10e18);
        vm.stopPrank();
    }

    // ─── Price Phase Tests ──────────────────────────────────────────────

    function test_getCurrentPrice_phase1() public view {
        assertEq(presale.getCurrentPrice(), INITIAL_PRICE);
    }

    function test_getCurrentPrice_phase2() public {
        vm.warp(block.timestamp + (PRICE_CHANGE_DAYS * 86400) + 1);
        assertEq(presale.getCurrentPrice(), SECOND_PRICE);
    }

    function test_buyTokens_autoUpdatePrice() public {
        vm.warp(block.timestamp + (PRICE_CHANGE_DAYS * 86400) + 1);

        uint256 amount = 100e18;
        uint256 totalTokens = (amount * 1e18) / SECOND_PRICE; // 200 tokens at $0.50

        vm.startPrank(buyer);
        usdt.approve(address(presale), amount);
        presale.buyTokens(0, amount);
        vm.stopPrank();

        assertEq(saleToken.balanceOf(buyer), totalTokens / 2);
        assertEq(presale.currentTokenPrice(), SECOND_PRICE);
    }

    function test_calculateTokenAmount_phase1() public view {
        uint256 amount = 100e18;
        uint256 expected = (amount * 1e18) / INITIAL_PRICE;
        assertEq(presale.calculateTokenAmount(amount), expected);
    }

    function test_calculateTokenAmount_phase2() public {
        vm.warp(block.timestamp + (PRICE_CHANGE_DAYS * 86400) + 1);
        uint256 amount = 100e18;
        uint256 expected = (amount * 1e18) / SECOND_PRICE;
        assertEq(presale.calculateTokenAmount(amount), expected);
    }

    // ─── Admin Tests ────────────────────────────────────────────────────

    function test_updateTokenPrice() public {
        presale.updateTokenPrice(0.15e18);
        assertEq(presale.currentTokenPrice(), 0.15e18);
    }

    function test_updateTokenPrice_revertsZero() public {
        vm.expectRevert(FixedPricePresale.InvalidPrice.selector);
        presale.updateTokenPrice(0);
    }

    function test_updateTokenPrice_revertsNonOwner() public {
        vm.prank(buyer);
        vm.expectRevert();
        presale.updateTokenPrice(0.3e18);
    }

    function test_updateSecondPhasePrice() public {
        presale.updateSecondPhasePrice(0.75e18);
        assertEq(presale.secondPhasePrice(), 0.75e18);
    }

    function test_updatePresaleEndTime() public {
        uint256 newEnd = block.timestamp + 200 * 86400;
        presale.updatePresaleEndTime(newEnd);
        assertEq(presale.presaleEndTime(), newEnd);
    }

    function test_updatePresaleEndTime_revertsPast() public {
        vm.expectRevert(FixedPricePresale.InvalidTime.selector);
        presale.updatePresaleEndTime(block.timestamp - 1);
    }

    function test_updatePriceChangeTime() public {
        uint256 newChange = block.timestamp + 60 * 86400;
        presale.updatePriceChangeTime(newChange);
        assertEq(presale.priceChangeTime(), newChange);
    }

    function test_setVestingVault() public {
        address newVault = address(0x999);
        presale.setVestingVault(newVault);
        assertEq(presale.vestingVault(), newVault);
    }

    function test_setVestingVault_revertsZero() public {
        vm.expectRevert(FixedPricePresale.InvalidAddress.selector);
        presale.setVestingVault(address(0));
    }

    function test_endPresale() public {
        presale.endPresale();
        assertTrue(presale.presaleEnded());
    }

    function test_endPresale_revertsIfAlreadyEnded() public {
        presale.endPresale();
        vm.expectRevert(FixedPricePresale.PresaleHasEnded.selector);
        presale.endPresale();
    }

    function test_withdrawUnsoldTokens() public {
        presale.endPresale();
        uint256 balance = saleToken.balanceOf(address(presale));
        presale.withdrawUnsoldTokens();
        assertEq(saleToken.balanceOf(owner), balance);
    }

    function test_withdrawUnsoldTokens_revertsIfNotEnded() public {
        vm.expectRevert(FixedPricePresale.PresaleNotEnded.selector);
        presale.withdrawUnsoldTokens();
    }

    function test_toggleToken_disable() public {
        presale.toggleToken(1, false);
        (, , bool isEnabled) = presale.acceptedTokens(1);
        assertFalse(isEnabled);
    }

    function test_updateDistributionWallets() public {
        presale.updateDistributionWallets(address(0x10), address(0x20), address(0x30), address(0x40));
        assertEq(presale.ownerWallet(), address(0x10));
    }

    function test_pause_unpause() public {
        presale.pause();

        vm.startPrank(buyer);
        usdt.approve(address(presale), 10e18);
        vm.expectRevert();
        presale.buyTokens(0, 10e18);
        vm.stopPrank();

        presale.unpause();

        vm.startPrank(buyer);
        usdt.approve(address(presale), 10e18);
        presale.buyTokens(0, 10e18);
        vm.stopPrank();

        assertTrue(saleToken.balanceOf(buyer) > 0);
    }

    function test_rescueTokens() public {
        MockERC20 randomToken = new MockERC20("Random", "RND", 18);
        randomToken.mint(address(presale), 100e18);
        presale.rescueTokens(address(randomToken), 100e18);
        assertEq(randomToken.balanceOf(owner), 100e18);
    }

    function test_rescueTokens_revertsSaleToken() public {
        vm.expectRevert(FixedPricePresale.InvalidAddress.selector);
        presale.rescueTokens(address(saleToken), 1e18);
    }

    function test_getPresaleStatus() public view {
        (uint256 tokensSold, uint256 tokensAvailable, uint256 timeRemaining, bool isEnded, , uint256 currentPrice) = presale.getPresaleStatus();
        assertEq(tokensSold, 0);
        assertEq(tokensAvailable, SALE_TOKEN_SUPPLY);
        assertTrue(timeRemaining > 0);
        assertFalse(isEnded);
        assertEq(currentPrice, INITIAL_PRICE);
    }

    function test_validatePurchaseAmount_valid() public view {
        (bool isValid, ) = presale.validatePurchaseAmount(50e18);
        assertTrue(isValid);
    }

    function test_receive_reverts() public {
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        (bool success, ) = address(presale).call{value: 1 ether}("");
        assertFalse(success);
    }

    function test_fallback_reverts() public {
        vm.prank(buyer);
        (bool success, ) = address(presale).call(abi.encodeWithSignature("nonExistentFunction()"));
        assertFalse(success);
    }

    function test_multiplePurchases_accumulateVesting() public {
        vm.startPrank(buyer);
        usdt.approve(address(presale), 300e18);
        presale.buyTokens(0, 100e18);
        presale.buyTokens(0, 100e18);
        presale.buyTokens(0, 100e18);
        vm.stopPrank();

        uint256 tokensPerPurchase = (100e18 * 1e18) / INITIAL_PRICE;
        uint256 vestingPer = tokensPerPurchase / 2;

        (uint256 total, , , , ) = vault.getUserVesting(buyer);
        assertEq(total, vestingPer * 3);
    }

    function test_buyTokens_exactMinimum() public {
        vm.startPrank(buyer);
        usdt.approve(address(presale), 1e18);
        presale.buyTokens(0, 1e18);
        vm.stopPrank();

        uint256 totalTokens = (1e18 * 1e18) / INITIAL_PRICE;
        assertEq(saleToken.balanceOf(buyer), totalTokens / 2);
    }

    function test_buyTokens_exactMaximum() public {
        uint256 amount = 100_000e18;
        usdt.mint(buyer, amount);

        vm.startPrank(buyer);
        usdt.approve(address(presale), amount);
        presale.buyTokens(0, amount);
        vm.stopPrank();

        uint256 totalTokens = (amount * 1e18) / INITIAL_PRICE;
        assertEq(saleToken.balanceOf(buyer), totalTokens / 2);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VESTING VAULT TESTS
    // ═══════════════════════════════════════════════════════════════════

    function _buyAndGetVestingAmount(address _buyer, uint256 paymentAmount) internal returns (uint256 vestingAmt) {
        uint256 totalTokens = (paymentAmount * 1e18) / INITIAL_PRICE;
        vestingAmt = totalTokens - (totalTokens * 50 / 100);

        vm.startPrank(_buyer);
        usdt.approve(address(presale), paymentAmount);
        presale.buyTokens(0, paymentAmount);
        vm.stopPrank();
    }

    function test_vault_constructor() public view {
        assertEq(address(vault.token()), address(saleToken));
        assertEq(vault.presaleContract(), address(presale));
        assertEq(vault.vestingDuration(), VESTING_DURATION_DAYS * 86400);
    }

    function test_vault_depositOnlyPresale() public {
        vm.prank(buyer);
        vm.expectRevert(VestingVault.OnlyPresale.selector);
        vault.deposit(buyer, 100e18);
    }

    function test_vault_claimRevertsBeforeVestingStart() public {
        _buyAndGetVestingAmount(buyer, 100e18);

        vm.prank(buyer);
        vm.expectRevert(VestingVault.VestingNotStarted.selector);
        vault.claim();
    }

    function test_vault_claimPartialAfterHalfVesting() public {
        uint256 vestingAmt = _buyAndGetVestingAmount(buyer, 100e18);

        // Warp to vesting start + half of vesting duration
        uint256 vestStart = vault.vestingStart();
        uint256 halfDuration = vault.vestingDuration() / 2;
        vm.warp(vestStart + halfDuration);

        uint256 expectedClaimable = (vestingAmt * halfDuration) / vault.vestingDuration();

        vm.prank(buyer);
        vault.claim();

        // Should have received ~50% of vesting amount
        // buyer already has instant tokens, so check vault claimed
        (, , uint256 claimed, , ) = vault.getUserVesting(buyer);
        assertEq(claimed, expectedClaimable);
    }

    function test_vault_claimFullAfterVestingEnd() public {
        uint256 vestingAmt = _buyAndGetVestingAmount(buyer, 100e18);

        // Warp past vesting end
        vm.warp(vault.vestingStart() + vault.vestingDuration() + 1);

        uint256 balanceBefore = saleToken.balanceOf(buyer);

        vm.prank(buyer);
        vault.claim();

        assertEq(saleToken.balanceOf(buyer), balanceBefore + vestingAmt);

        (uint256 total, uint256 vested, uint256 claimed, uint256 claimable, uint256 remaining) = vault.getUserVesting(buyer);
        assertEq(total, vestingAmt);
        assertEq(vested, vestingAmt);
        assertEq(claimed, vestingAmt);
        assertEq(claimable, 0);
        assertEq(remaining, 0);
    }

    function test_vault_claimMultipleTimes() public {
        uint256 vestingAmt = _buyAndGetVestingAmount(buyer, 100e18);
        uint256 vestStart = vault.vestingStart();
        uint256 duration = vault.vestingDuration();

        // Claim at 25%
        vm.warp(vestStart + duration / 4);
        vm.prank(buyer);
        vault.claim();

        (, , uint256 claimed1, , ) = vault.getUserVesting(buyer);
        assertEq(claimed1, vestingAmt / 4);

        // Claim at 75%
        vm.warp(vestStart + (duration * 3) / 4);
        vm.prank(buyer);
        vault.claim();

        (, , uint256 claimed2, , ) = vault.getUserVesting(buyer);
        assertEq(claimed2, (vestingAmt * 3) / 4);

        // Claim at 100%
        vm.warp(vestStart + duration);
        vm.prank(buyer);
        vault.claim();

        (, , uint256 claimed3, , ) = vault.getUserVesting(buyer);
        assertEq(claimed3, vestingAmt);
    }

    function test_vault_claimRevertsNothingToClaim() public {
        _buyAndGetVestingAmount(buyer, 100e18);

        // Warp past vesting end and claim all
        vm.warp(vault.vestingStart() + vault.vestingDuration() + 1);
        vm.prank(buyer);
        vault.claim();

        // Try to claim again
        vm.prank(buyer);
        vm.expectRevert(VestingVault.NothingToClaim.selector);
        vault.claim();
    }

    function test_vault_getUserVesting_beforeStart() public {
        uint256 vestingAmt = _buyAndGetVestingAmount(buyer, 100e18);

        (uint256 total, uint256 vested, uint256 claimed, uint256 claimable, uint256 remaining) = vault.getUserVesting(buyer);
        assertEq(total, vestingAmt);
        assertEq(vested, 0);
        assertEq(claimed, 0);
        assertEq(claimable, 0);
        assertEq(remaining, vestingAmt);
    }

    function test_vault_multipleBuyers() public {
        uint256 vestingAmt1 = _buyAndGetVestingAmount(buyer, 100e18);
        uint256 vestingAmt2 = _buyAndGetVestingAmount(buyer2, 200e18);

        (uint256 total1, , , , ) = vault.getUserVesting(buyer);
        (uint256 total2, , , , ) = vault.getUserVesting(buyer2);

        assertEq(total1, vestingAmt1);
        assertEq(total2, vestingAmt2);
        assertEq(vault.totalDeposited(), vestingAmt1 + vestingAmt2);
    }

    function test_vault_totalDepositedAndClaimed() public {
        uint256 vestingAmt = _buyAndGetVestingAmount(buyer, 100e18);

        assertEq(vault.totalDeposited(), vestingAmt);
        assertEq(vault.totalClaimed(), 0);

        vm.warp(vault.vestingStart() + vault.vestingDuration() + 1);
        vm.prank(buyer);
        vault.claim();

        assertEq(vault.totalClaimed(), vestingAmt);
    }

    // ─── Vault Admin Tests ──────────────────────────────────────────────

    function test_vault_updateVestingStart() public {
        uint256 newStart = block.timestamp + 200 * 86400;
        vault.updateVestingStart(newStart);
        assertEq(vault.vestingStart(), newStart);
    }

    function test_vault_updateVestingStart_revertsAfterStarted() public {
        vm.warp(vault.vestingStart() + 1);
        vm.expectRevert(VestingVault.InvalidTime.selector);
        vault.updateVestingStart(block.timestamp + 100 * 86400);
    }

    function test_vault_updateVestingDuration() public {
        vault.updateVestingDuration(365);
        assertEq(vault.vestingDuration(), 365 * 86400);
    }

    function test_vault_updateVestingDuration_revertsAfterStarted() public {
        vm.warp(vault.vestingStart() + 1);
        vm.expectRevert(VestingVault.InvalidTime.selector);
        vault.updateVestingDuration(365);
    }

    function test_vault_updatePresaleContract() public {
        address newPresale = address(0x888);
        vault.updatePresaleContract(newPresale);
        assertEq(vault.presaleContract(), newPresale);
    }

    function test_vault_updatePresaleContract_revertsZero() public {
        vm.expectRevert(VestingVault.InvalidAddress.selector);
        vault.updatePresaleContract(address(0));
    }
}
