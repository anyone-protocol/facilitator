// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Facility is Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using SafeMath for uint256;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public tokenAddress;
    address payable public operatorAddress;

    uint256 public GAS_COST;
    uint256 public GAS_PRICE;

    mapping(address => uint256) public availableBudget;
    mapping(address => uint256) public usedBudget;
    mapping(address => uint256) public allocatedTokens;
    mapping(address => uint256) public claimedTokens;

    event GasBudgetUpdated(address indexed sender, uint256 amount);
    event RequestingUpdate(address indexed _account);
    event AllocationUpdated(address indexed _account, uint256 _value);
    event AllocationClaimed(address indexed _account, uint256 _value);

    receive() external payable whenNotPaused {
        availableBudget[msg.sender] += msg.value;
        operatorAddress.transfer(msg.value);
        emit GasBudgetUpdated(
            msg.sender,
            availableBudget[msg.sender] - usedBudget[msg.sender]
        );
        
        uint256 required = GAS_COST * GAS_PRICE;
        uint256 available = msg.value + availableBudget[msg.sender];
        uint256 used = usedBudget[msg.sender];

        require(
            available > 0,
            "Facility: no user provided budget, send ETH to contract address to refill"
        );
        require(
            available > used,
            "Facility: user provided budget is depleted, send ETH to contract address to refill"
        );
        require(
            ( available - used ) >= required,
            "Facility: not enough user provided budget, send ETH to contract address to refill"
        );
        
        emit RequestingUpdate(msg.sender);
    }

    function updateAndClaim(address addr, uint256 allocated)
        external 
        whenNotPaused 
        onlyRole(OPERATOR_ROLE)
    {
        require(
            addr != address(0), 
            "Facility: can't update allocation for 0x0"
        );

        allocatedTokens[addr] = allocated;
        usedBudget[addr] += GAS_COST * GAS_PRICE;
        emit AllocationUpdated(addr, allocated);

        uint256 remainingBudget = 0;
        if (availableBudget[addr] >= usedBudget[addr]) {
            remainingBudget = availableBudget[addr] - usedBudget[addr];
        }
        emit GasBudgetUpdated(addr, remainingBudget);

        require(
            allocated > 0,
            "Facility: no tokens allocated for sender"
        );

        uint256 claimed = claimedTokens[addr];
        require(
            allocated > claimed,
            "Facility: no tokens available to claim"
        );

        IERC20 token = IERC20(tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        
        uint256 claimable = allocated - claimed;
        require(
            contractBalance > claimable,
            "Facility: not enough tokens to claim"
        );

        require(
            token.transfer(addr, claimable), 
            "Facility: transfer of claimable tokens failed"
        );

        claimedTokens[addr] = allocated;
        emit AllocationClaimed(addr, claimable);
    }

    function setGasCost(uint256 _value) 
        external 
        whenNotPaused 
        onlyRole(OPERATOR_ROLE)
    {
        GAS_COST = _value;
    }

    function setGasPrice(uint256 _value) 
        external 
        whenNotPaused 
        onlyRole(OPERATOR_ROLE)
    {
        GAS_PRICE = _value;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _tokenAddress, 
        address payable _operator
    ) initializer public {
        tokenAddress = _tokenAddress;
        operatorAddress = _operator;
        
        GAS_COST = 21_644;
        GAS_PRICE = 40 * 1_000_000_000;

        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, operatorAddress);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}
