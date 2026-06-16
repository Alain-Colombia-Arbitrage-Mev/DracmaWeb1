// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Transfer {
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title DRACMA TokenDistributor
/// @notice Holds DRACMA sale inventory and releases tokens for paid NOWPayments orders.
/// @dev The backend calls releaseTokens(recipient, amount, orderId) after a verified paid IPN.
contract TokenDistributor {
    IERC20Transfer public immutable saleToken;
    address public owner;
    address public pendingOwner;
    address public operator;

    mapping(bytes32 => bool) public releasedOrders;

    error Unauthorized();
    error NotPendingOwner();
    error ZeroAddress();
    error ZeroAmount();
    error EmptyOrderId();
    error ArrayLengthMismatch();
    error OrderAlreadyReleased(bytes32 orderHash);
    error TransferFailed();

    event TokensReleased(
        bytes32 indexed orderHash,
        string orderId,
        address indexed recipient,
        uint256 amount
    );
    event TokensWithdrawn(address indexed recipient, uint256 amount);
    event OperatorUpdated(address indexed previousOperator, address indexed newOperator);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferCancelled(address indexed currentOwner, address indexed cancelledOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        _requireOwner();
        _;
    }

    modifier onlyReleaseAuthority() {
        _requireReleaseAuthority();
        _;
    }

    constructor(address saleToken_, address initialOwner_, address initialOperator_) {
        if (saleToken_ == address(0) || initialOwner_ == address(0) || initialOperator_ == address(0)) {
            revert ZeroAddress();
        }

        saleToken = IERC20Transfer(saleToken_);
        owner = initialOwner_;
        operator = initialOperator_;

        emit OwnershipTransferred(address(0), initialOwner_);
        emit OperatorUpdated(address(0), initialOperator_);
    }

    function getOrderHash(string calldata orderId) external pure returns (bytes32) {
        return _orderHash(orderId);
    }

    function releaseTokens(
        address recipient,
        uint256 amount,
        string calldata orderId
    ) external onlyReleaseAuthority {
        _releaseTokens(recipient, amount, orderId);
    }

    function batchReleaseTokens(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string[] calldata orderIds
    ) external onlyReleaseAuthority {
        uint256 length = recipients.length;
        if (length != amounts.length || length != orderIds.length) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < length;) {
            _releaseTokens(recipients[i], amounts[i], orderIds[i]);
            unchecked {
                ++i;
            }
        }
    }

    function withdrawTokens(address recipient, uint256 amount) external onlyOwner {
        _validateRecipientAndAmount(recipient, amount);
        _safeTransfer(recipient, amount);
        emit TokensWithdrawn(recipient, amount);
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) {
            revert ZeroAddress();
        }

        address previousOperator = operator;
        operator = newOperator;
        emit OperatorUpdated(previousOperator, newOperator);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }

        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function cancelOwnershipTransfer() external onlyOwner {
        address cancelledOwner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferCancelled(owner, cancelledOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) {
            revert NotPendingOwner();
        }

        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }

    function _releaseTokens(
        address recipient,
        uint256 amount,
        string calldata orderId
    ) private {
        _validateRecipientAndAmount(recipient, amount);
        if (bytes(orderId).length == 0) {
            revert EmptyOrderId();
        }

        bytes32 orderHash = _orderHash(orderId);
        if (releasedOrders[orderHash]) {
            revert OrderAlreadyReleased(orderHash);
        }

        releasedOrders[orderHash] = true;
        _safeTransfer(recipient, amount);

        emit TokensReleased(orderHash, orderId, recipient, amount);
    }

    function _validateRecipientAndAmount(address recipient, uint256 amount) private pure {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }
    }

    function _requireOwner() private view {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
    }

    function _requireReleaseAuthority() private view {
        if (msg.sender != owner && msg.sender != operator) {
            revert Unauthorized();
        }
    }

    function _orderHash(string calldata orderId) private pure returns (bytes32) {
        return keccak256(bytes(orderId));
    }

    function _safeTransfer(address recipient, uint256 amount) private {
        (bool success, bytes memory data) = address(saleToken).call(
            abi.encodeCall(IERC20Transfer.transfer, (recipient, amount))
        );

        if (!success) {
            revert TransferFailed();
        }

        if (data.length == 0) {
            return;
        }

        if (data.length < 32 || !abi.decode(data, (bool))) {
            revert TransferFailed();
        }
    }
}
