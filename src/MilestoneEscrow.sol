// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MilestoneEscrow
/// @notice Client locks the full contract value up front; releases it to a
///         freelancer milestone by milestone as each one is approved. If the
///         deadline passes with work unreleased, the client reclaims the rest.
/// @dev W1 testnet portfolio contract. Immutable (no proxy). ETH native only.
contract MilestoneEscrow {
    struct Milestone {
        uint256 amount;   // fixed at creation
        bool approved;    // client approved -> claimable
        bool claimed;     // freelancer claimed -> paid
    }

    address public immutable client;
    address public immutable freelancer;
    uint256 public immutable deadline;
    uint256 public immutable totalFunded;   // == sum(amounts), set at creation

    uint256 public totalReleased;
    uint256 public totalUnreleased;
    uint256 public totalReclaimed;
    bool public funded;

    Milestone[] public milestones;

    // --- events (AC-12) ---
    event EscrowCreated(address indexed client, address indexed freelancer, uint256 total, uint256 deadline);
    event Funded(address indexed client, uint256 amount);
    event MilestoneApproved(uint256 indexed id, uint256 amount);
    event MilestoneClaimed(uint256 indexed id, address indexed freelancer, uint256 amount);
    event ExpiredReclaimed(address indexed client, uint256 amount);

    // --- errors (gas-cheap, explicit) ---
    error NotClient();
    error NotFreelancer();
    error AlreadyFunded();
    error WrongAmount();
    error InvalidMilestone();
    error NotApproved();
    error AlreadyClaimed();
    error NotExpired();
    error NothingToReclaim();
    error TransferFailed();

    modifier onlyClient() {
        if (msg.sender != client) revert NotClient();
        _;
    }
    modifier onlyFreelancer() {
        if (msg.sender != freelancer) revert NotFreelancer();
        _;
    }

    constructor(address _freelancer, uint256[] memory _amounts, uint256 _deadline) {
        require(_freelancer != address(0), "freelancer=0");
        require(_deadline > block.timestamp, "deadline in past");
        require(_amounts.length > 0, "no milestones");

        client = msg.sender;
        freelancer = _freelancer;
        deadline = _deadline;

        uint256 sum;
        for (uint256 i; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "amount=0");
            milestones.push(Milestone({amount: _amounts[i], approved: false, claimed: false}));
            sum += _amounts[i];
        }
        require(sum > 0, "total=0");
        totalFunded = sum;
        // NOTE: totalUnreleased stays 0 until funded — the escrow must not claim
        // it owes money it does not yet hold. (Found by the invariant test.)
        emit EscrowCreated(msg.sender, _freelancer, sum, _deadline);
    }

    /// @notice Fund the escrow with EXACTLY the total (AC-2, AC-3).
    function fund() external payable onlyClient {
        if (funded) revert AlreadyFunded();
        if (msg.value != totalFunded) revert WrongAmount();
        funded = true;
        totalUnreleased = totalFunded;   // now the escrow actually holds the funds
        emit Funded(msg.sender, msg.value);
    }

    /// @notice Client approves a milestone -> becomes claimable (AC-4, AC-6).
    function approveMilestone(uint256 id) external onlyClient {
        if (id >= milestones.length) revert InvalidMilestone();
        Milestone storage m = milestones[id];
        if (m.approved) return;          // idempotent approve
        m.approved = true;
        emit MilestoneApproved(id, m.amount);
    }

    /// @notice Freelancer claims an approved, unclaimed milestone (AC-5, AC-7, AC-8).
    /// @dev checks-effects-interactions: state is settled BEFORE the transfer.
    function claim(uint256 id) external onlyFreelancer {
        if (id >= milestones.length) revert InvalidMilestone();
        Milestone storage m = milestones[id];
        if (!m.approved) revert NotApproved();
        if (m.claimed) revert AlreadyClaimed();

        // --- effects ---
        m.claimed = true;
        uint256 amount = m.amount;
        totalReleased += amount;
        totalUnreleased -= amount;

        // --- interaction (last) ---
        (bool ok, ) = freelancer.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit MilestoneClaimed(id, freelancer, amount);
    }

    /// @notice After the deadline, client reclaims everything not yet released (AC-9, AC-10).
    function reclaimExpired() external onlyClient {
        if (block.timestamp <= deadline) revert NotExpired();
        uint256 amount = totalUnreleased;
        if (amount == 0) revert NothingToReclaim();

        // --- effects ---
        totalUnreleased = 0;
        totalReclaimed += amount;

        // --- interaction ---
        (bool ok, ) = client.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit ExpiredReclaimed(client, amount);
    }

    // --- views ---
    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }
}
