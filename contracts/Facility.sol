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
    }

    function receiveAndRequestUpdate() external payable whenNotPaused {
        availableBudget[msg.sender] += msg.value;
        operatorAddress.transfer(msg.value);
        emit GasBudgetUpdated(
            msg.sender,
            availableBudget[msg.sender] - usedBudget[msg.sender]
        );
        this._requestUpdate(msg.sender);
    }

    function requestUpdate() external whenNotPaused {
        this._requestUpdate(msg.sender);
    }

    function _requestUpdate(address addr) public whenNotPaused {
        uint256 required = GAS_COST * GAS_PRICE;
        uint256 available = availableBudget[addr];
        uint256 used = usedBudget[addr];

        require(
            available > used,
            "Facility: requires user provided gas budget to create allocation updates"
        );
        require(
            ( available - used ) >= required,
            "Facility: user provided budget is depleted, send ETH to contract address to refill"
        );
        
        emit RequestingUpdate(addr);
    }

    function updateAllocation(address addr, uint256 _value) 
        external 
        whenNotPaused 
        onlyRole(OPERATOR_ROLE)
    {
        this._updateAllocation(addr, _value);
    }

    function _updateAllocation(address addr, uint256 _value) 
        public 
        whenNotPaused 
        onlyRole(OPERATOR_ROLE)
    {
        require(
            addr != address(0), 
            "Facility: can't update allocation for 0x0"
        );

        allocatedTokens[addr] = _value;
        usedBudget[addr] += GAS_COST * GAS_PRICE;

        uint256 remainingBudget = 0;
        if (availableBudget[addr] >= usedBudget[addr]) {
            remainingBudget = availableBudget[addr] - usedBudget[addr];
        }
        
        emit GasBudgetUpdated(addr, remainingBudget);
        emit AllocationUpdated(addr, _value);
    }

    function updateAndClaimAllocation(address addr, uint256 _value)
        external 
        whenNotPaused 
        onlyRole(OPERATOR_ROLE)
    {
        this._updateAllocation(addr, _value);
        this._claimAllocation(addr);
    }

    function claimAllocation()
        external 
        whenNotPaused
    {
        this._claimAllocation(msg.sender);
    }

    function _claimAllocation(address addr)
        external 
        whenNotPaused
    {
        require(
            addr != address(0),
            "Facility: can't claim allocation for 0x0"
        );
        
        uint256 allocated = allocatedTokens[msg.sender];
        require(
            allocated > 0,
            "Facility: no tokens allocated for sender"
        );

        uint256 _claimed = claimedTokens[msg.sender];
        require(
            allocated > _claimed,
            "Facility: no tokens available to claim"
        );

        IERC20 token = IERC20(tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        
        uint256 _claimable = allocated - _claimed;
        require(
            contractBalance > _claimable,
            "Facility: not enough tokens to claim"
        );

        require(
            token.transfer(msg.sender, _claimable), 
            "Facility: transfer of claimable tokens failed"
        );

        claimedTokens[msg.sender] = allocated;
        emit AllocationClaimed(msg.sender, _claimable);
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
