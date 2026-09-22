// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

/// @notice Handler bounds inputs so the fuzzer explores valid escrow states.
contract EscrowHandler is Test {
    MilestoneEscrow public esc;
    address public client;
    address public freelancer;
    uint256 public ghost_released;

    constructor(MilestoneEscrow _esc, address _client, address _freelancer) {
        esc = _esc; client = _client; freelancer = _freelancer;
    }

    function fund(uint256 v) external {
        v = bound(v, 0, 20 ether);
        vm.prank(client);
        try esc.fund{value: v}() {} catch {}
    }
    function approve(uint256 id) external {
        id = bound(id, 0, 2);
        vm.prank(client);
        try esc.approveMilestone(id) {} catch {}
    }
    function claim(uint256 id) external {
        id = bound(id, 0, 2);
        vm.prank(freelancer);
        try esc.claim(id) {} catch {}
    }
    function reclaim() external {
        vm.prank(client);
        try esc.reclaimExpired() {} catch {}
    }
    function warp(uint256 t) external {
        vm.warp(block.timestamp + bound(t, 0, 60 days));
    }
    receive() external payable {}
}

contract MilestoneEscrowInvariantTest is Test {
    MilestoneEscrow esc;
    EscrowHandler handler;
    address client = address(0xC11E17);
    address freelancer = address(0xF4EE);

    function setUp() public {
        uint256[] memory a = new uint256[](3);
        a[0] = 1 ether; a[1] = 2 ether; a[2] = 3 ether;
        vm.deal(client, 100 ether);
        vm.prank(client);
        esc = new MilestoneEscrow(freelancer, a, block.timestamp + 30 days);
        handler = new EscrowHandler(esc, client, freelancer);
        vm.deal(address(handler), 100 ether);
        targetContract(address(handler));
    }

    /// INVARIANT 1: the escrow is always solvent.
    function invariant_Solvency() public view {
        assertGe(address(esc).balance, esc.totalUnreleased(), "INSOLVENT");
    }

    /// INVARIANT 2: released + unreleased + reclaimed == (funded ? total : 0).
    /// Every wei is accounted for exactly once: paid out, still owed, or reclaimed.
    function invariant_Conservation() public view {
        uint256 expected = esc.funded() ? esc.totalFunded() : 0;
        assertEq(
            esc.totalReleased() + esc.totalUnreleased() + esc.totalReclaimed(),
            expected,
            "NOT CONSERVED"
        );
    }

    /// INVARIANT 5: only the client could have funded/approved (no stray ETH).
    function invariant_NoStrayEther() public view {
        assertLe(address(esc).balance, esc.totalFunded(), "MORE THAN FUNDED");
    }
}
