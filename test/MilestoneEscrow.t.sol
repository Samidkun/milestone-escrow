// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

contract MilestoneEscrowTest is Test {
    MilestoneEscrow esc;
    address client = address(0xC11E17);
    address freelancer = address(0xF4EE);
    address stranger = address(0xBAD);
    uint256[] amounts;
    uint256 deadline;

    function setUp() public {
        amounts = new uint256[](3);
        amounts[0] = 1 ether; amounts[1] = 2 ether; amounts[2] = 3 ether;
        deadline = block.timestamp + 30 days;
        vm.deal(client, 100 ether);
        vm.prank(client);
        esc = new MilestoneEscrow(freelancer, amounts, deadline);
    }

    // AC-1: creation stores parties + milestones
    function test_Create_StoresPartiesAndMilestones() public view {
        assertEq(esc.client(), client);
        assertEq(esc.freelancer(), freelancer);
        assertEq(esc.deadline(), deadline);
        assertEq(esc.milestoneCount(), 3);
    }

    // AC-2: fund with exact total
    function test_Fund_ExactTotal() public {
        vm.prank(client);
        esc.fund{value: 6 ether}();
        assertTrue(esc.funded());
        assertEq(esc.totalFunded(), 6 ether);
        assertEq(address(esc).balance, 6 ether);
    }

    // AC-3: wrong amount reverts
    function test_RevertWhen_FundWrongAmount() public {
        vm.prank(client);
        vm.expectRevert();
        esc.fund{value: 5 ether}();
    }

    // AC-4: approve milestone
    function test_ApproveMilestone() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client); esc.approveMilestone(0);
        (, bool approved, ) = esc.milestones(0);
        assertTrue(approved);
    }

    // AC-5: claim approved milestone
    function test_Claim_ApprovedMilestone() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client); esc.approveMilestone(0);
        uint256 before = freelancer.balance;
        vm.prank(freelancer); esc.claim(0);
        assertEq(freelancer.balance - before, 1 ether);
        (, , bool claimed) = esc.milestones(0);
        assertTrue(claimed);
        assertEq(esc.totalReleased(), 1 ether);
    }

    // AC-6: only client can approve
    function test_RevertWhen_ApproveNotClient() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(stranger);
        vm.expectRevert();
        esc.approveMilestone(0);
    }

    // AC-7: only freelancer can claim
    function test_RevertWhen_ClaimNotFreelancer() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client); esc.approveMilestone(0);
        vm.prank(stranger);
        vm.expectRevert();
        esc.claim(0);
    }

    // AC-8a: cannot claim unapproved
    function test_RevertWhen_ClaimNotApproved() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(freelancer);
        vm.expectRevert();
        esc.claim(0);
    }

    // AC-8b: cannot double-claim
    function test_RevertWhen_DoubleClaim() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client); esc.approveMilestone(0);
        vm.prank(freelancer); esc.claim(0);
        vm.prank(freelancer);
        vm.expectRevert();
        esc.claim(0);
    }

    // AC-9: reclaim after deadline
    function test_Reclaim_AfterDeadline() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client); esc.approveMilestone(0);
        vm.prank(freelancer); esc.claim(0);           // 1 ether released
        vm.warp(deadline + 1);
        uint256 before = client.balance;
        vm.prank(client); esc.reclaimExpired();
        assertEq(client.balance - before, 5 ether);   // the remaining 5
        assertEq(address(esc).balance, 0);
    }

    // AC-10: cannot reclaim before deadline
    function test_RevertWhen_ReclaimBeforeDeadline() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client);
        vm.expectRevert();
        esc.reclaimExpired();
    }

    // AC-11: invariant holds after normal flow
    function test_Invariant_AfterFlow() public {
        vm.prank(client); esc.fund{value: 6 ether}();
        vm.prank(client); esc.approveMilestone(0);
        vm.prank(client); esc.approveMilestone(1);
        vm.prank(freelancer); esc.claim(0);
        vm.prank(freelancer); esc.claim(1);
        assertGe(address(esc).balance, esc.totalUnreleased());
        assertEq(esc.totalReleased() + esc.totalUnreleased(), esc.totalFunded());
    }
}
