// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

/// Malicious freelancer: re-enters claim() every time it receives ETH.
contract ReentrantFreelancer {
    MilestoneEscrow public esc;
    uint256 public reentries;
    uint256 public maxReentries;
    bool private attacking;
    function setTarget(MilestoneEscrow _e) external { esc = _e; }
    function go(uint256 id) external { attacking = true; esc.claim(id); attacking = false; }
    receive() external payable {
        if (attacking && reentries < maxReentries) {
            reentries++;
            for (uint256 i; i < 3; i++) { try esc.claim(i) {} catch {} }
        }
    }
    constructor(uint256 _max) { maxReentries = _max; }
}

/// Malicious client: re-enters reclaimExpired() every time it receives ETH.
contract ReentrantClient {
    MilestoneEscrow public esc;
    uint256 public reentries;
    bool private attacking;
    function setTarget(MilestoneEscrow _e) external { esc = _e; }
    function go() external { attacking = true; esc.reclaimExpired(); attacking = false; }
    receive() external payable {
        if (attacking && reentries < 10) { reentries++; try esc.reclaimExpired() {} catch {} }
    }
}

contract RedteamMilestoneEscrow is Test {
    address client = address(0xC11E17);
    address freelancer = address(0xF4EE);
    address stranger = address(0xBAD);

    function _amounts() internal pure returns (uint256[] memory a) {
        a = new uint256[](3);
        a[0] = 1 ether; a[1] = 2 ether; a[2] = 3 ether;
    }

    // ---------------- T1 — ACCESS CONTROL ----------------
    function test_T1_accessControl_resisted() public {
        vm.deal(client, 100 ether);
        vm.prank(client);
        MilestoneEscrow esc = new MilestoneEscrow(freelancer, _amounts(), block.timestamp + 30 days);
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client); esc.approveMilestone(0);

        vm.prank(stranger); vm.expectRevert(MilestoneEscrow.NotClient.selector); esc.approveMilestone(1);
        vm.prank(stranger); vm.expectRevert(MilestoneEscrow.NotFreelancer.selector); esc.claim(0);
        vm.prank(freelancer); vm.expectRevert(MilestoneEscrow.NotClient.selector); esc.approveMilestone(1);
        vm.warp(block.timestamp + 31 days);
        vm.prank(stranger); vm.expectRevert(MilestoneEscrow.NotClient.selector); esc.reclaimExpired();
        console2.log("T1 access control: RESISTED (4 unauthorized paths reverted)");
    }

    // ---------------- T2 — ECONOMIC ----------------
    function test_T2_economic_resisted() public {
        vm.deal(client, 100 ether);
        vm.prank(client);
        MilestoneEscrow esc = new MilestoneEscrow(freelancer, _amounts(), block.timestamp + 30 days);
        vm.prank(client); esc.fund{value: 6 ether}();

        // double claim
        vm.prank(client); esc.approveMilestone(0);
        vm.prank(freelancer); esc.claim(0);
        uint256 bal = freelancer.balance;
        vm.prank(freelancer); vm.expectRevert(MilestoneEscrow.AlreadyClaimed.selector); esc.claim(0);
        assertEq(freelancer.balance, bal);

        // claim all -> solvency must hold, escrow empties
        vm.prank(client); esc.approveMilestone(1);
        vm.prank(client); esc.approveMilestone(2);
        vm.prank(freelancer); esc.claim(1);
        vm.prank(freelancer); esc.claim(2);
        assertEq(address(esc).balance, 0);
        assertEq(esc.totalReleased() + esc.totalUnreleased() + esc.totalReclaimed(), esc.totalFunded());

        // reclaim only the unreleased part
        vm.deal(client, 100 ether);
        vm.prank(client);
        MilestoneEscrow e2 = new MilestoneEscrow(freelancer, _amounts(), block.timestamp + 30 days);
        vm.prank(client); e2.fund{value: 6 ether}();
        vm.prank(client); e2.approveMilestone(0);
        vm.prank(freelancer); e2.claim(0);          // 1 released
        vm.warp(block.timestamp + 31 days);
        uint256 before = client.balance;
        vm.prank(client); e2.reclaimExpired();
        assertEq(client.balance - before, 5 ether, "reclaim took wrong amount");
        console2.log("T2 economic (double-claim, over-claim, reclaim): RESISTED");
    }

    // ---------------- T3 — REENTRANCY ----------------
    function test_T3_reentrancy_freelancer_resisted() public {
        vm.deal(client, 100 ether);
        ReentrantFreelancer atk = new ReentrantFreelancer(10);
        vm.prank(client);
        MilestoneEscrow esc = new MilestoneEscrow(address(atk), _amounts(), block.timestamp + 30 days);
        atk.setTarget(esc);
        vm.prank(client); esc.fund{value: 6 ether}();
        // ONLY milestone 0 is approved — the attacker must not be able to get
        // more than that one milestone's amount, no matter how it re-enters.
        vm.prank(client); esc.approveMilestone(0);

        uint256 before = address(atk).balance;
        atk.go(0);
        uint256 gained = address(atk).balance - before;
        assertLe(gained, 1 ether, "REENTRANCY PROFIT: gained more than one milestone");
        assertGe(address(esc).balance, esc.totalUnreleased(), "INSOLVENT");
        console2.log("T3 reentrancy (freelancer): RESISTED, gained wei:", gained);
    }

    function test_T3_reentrancy_client_resisted() public {
        ReentrantClient atk = new ReentrantClient();
        vm.deal(address(atk), 100 ether);
        vm.prank(address(atk));
        MilestoneEscrow esc = new MilestoneEscrow(freelancer, _amounts(), block.timestamp + 30 days);
        atk.setTarget(esc);
        vm.prank(address(atk)); esc.fund{value: 6 ether}();

        vm.warp(block.timestamp + 31 days);
        uint256 before = address(atk).balance;
        atk.go();
        uint256 gained = address(atk).balance - before;
        assertLe(gained, 6 ether, "CLIENT REENTRANCY: reclaimed more than unreleased");
        assertEq(address(esc).balance, 0, "escrow not drained to zero");
        console2.log("T3 reentrancy (client reclaim): RESISTED, gained wei:", gained);
    }

    // ---------------- T4 — ADVANCED ----------------
    function test_T4_advanced_notApplicable() public {
        console2.log("T4 advanced: NOT TESTED (no oracle/proxy/governance/signature/token in scope)");
    }
}
