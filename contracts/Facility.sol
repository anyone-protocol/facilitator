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
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    address public tokenContractAddress;

    mapping(address => uint256) public gasAvailable;
    mapping(address => uint256) public gasUsed;
    mapping(address => uint256) public tokenAllocation;
    mapping(address => uint256) public tokenClaimed;

    event GasBudgetReceived(address indexed sender, uint256 amount);
    event RequestingUpdate(address indexed _account);
    event AllocationUpdated(address indexed _account, uint256 _value);
    event AllocationClaimed(address indexed _account, uint256 _value);

    receive() external payable {
        gasAvailable[msg.sender] += msg.value;
        emit GasBudgetReceived(msg.sender, msg.value);
    }

    function requestUpdate() external whenNotPaused {
        uint256 required = gasleft();
        uint256 available = gasAvailable[msg.sender];
        uint256 used = gasUsed[msg.sender];

        require(
            available > used,
            "Facility: requires user provided gas budget to create allocation updates"
        );
        require(
            ( available - used ) >= required,
            "Facility: user provided budget is depleted, send ETH to contract address to refill"
        );
        emit RequestingUpdate(msg.sender);
    }

    function updateAllocation(address _account, uint256 _value) 
        external 
        whenNotPaused 
        onlyRole(VALIDATOR_ROLE)
    {
        uint256 requiredGas = gasleft();

        require(
            _account != address(0), 
            "Facility: can't update allocation for 0x0"
        );
        tokenAllocation[_account] = _value;
        
        gasUsed[msg.sender] += requiredGas;
        emit AllocationUpdated(_account, _value);
    }

    function claimAllocation()
        external 
        whenNotPaused
    {
        address requestingAccount = msg.sender;
        require(
            requestingAccount != address(0),
            "Facility: can't claim allocation for 0x0"
        );
        
        uint256 available = tokenAllocation[requestingAccount];
        require(
            available > 0,
            "Facility: no tokens allocated for sender"
        );

        uint256 claimed = tokenClaimed[requestingAccount];
        require(
            available > claimed,
            "Facility: no tokens available to claim"
        );

        // IERC20 token = IERC20(tokenContractAddress);
        // uint256 contractBalance = token.balanceOf(address(this));
        uint256 contractBalance = 10_000_000_000_000;

        uint256 claimable = available - claimed;
        require(
            contractBalance > claimable,
            "Facility: not enough tokens to claim"
        );

        // require(
        //     token.transfer(msg.sender, claimable), 
        //     "Facility: transfer of claimable tokens failed"
        // );

        tokenClaimed[requestingAccount] = available;
        emit AllocationClaimed(requestingAccount, claimable);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _tokenContract) initializer public {
        tokenContractAddress = _tokenContract;
        
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
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
