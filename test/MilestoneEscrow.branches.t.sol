// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

contract RejectEther { receive() external payable { revert("no eth"); } }

contract MilestoneEscrowBranchesTest is Test {
    MilestoneEscrow esc;
    address client = address(0xC11E17);
    address freelancer = address(0xF4EE);

    function _new() internal {
        uint256[] memory a = new uint256[](2);
        a[0] = 1 ether; a[1] = 1 ether;
        vm.deal(client, 50 ether);
        vm.prank(client);
        esc = new MilestoneEscrow(freelancer, a, block.timestamp + 30 days);
    }

    function setUp() public { _new(); }

    function test_RevertWhen_FundTwice() public {
        vm.prank(client); esc.fund{value: 2 ether}();
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.AlreadyFunded.selector);
        esc.fund{value: 2 ether}();
    }

    function test_RevertWhen_ApproveInvalidId() public {
        vm.prank(client); esc.fund{value: 2 ether}();
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.InvalidMilestone.selector);
        esc.approveMilestone(99);
    }

    function test_ApproveIsIdempotent() public {
        vm.prank(client); esc.fund{value: 2 ether}();
        vm.prank(client); esc.approveMilestone(0);
        vm.prank(client); esc.approveMilestone(0);   // second approve = no-op
        (, bool approved, ) = esc.milestones(0);
        assertTrue(approved);
    }

    function test_RevertWhen_ClaimInvalidId() public {
        vm.prank(client); esc.fund{value: 2 ether}();
        vm.prank(freelancer);
        vm.expectRevert(MilestoneEscrow.InvalidMilestone.selector);
        esc.claim(99);
    }

    function test_RevertWhen_NothingToReclaim() public {
        vm.prank(client); esc.fund{value: 2 ether}();
        vm.prank(client); esc.approveMilestone(0);
        vm.prank(client); esc.approveMilestone(1);
        vm.prank(freelancer); esc.claim(0);
        vm.prank(freelancer); esc.claim(1);
        vm.warp(block.timestamp + 31 days);
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.NothingToReclaim.selector);
        esc.reclaimExpired();
    }

    function test_ReclaimIsIdempotentGuard() public {
        vm.prank(client); esc.fund{value: 2 ether}();
        vm.warp(block.timestamp + 31 days);
        vm.prank(client); esc.reclaimExpired();
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.NothingToReclaim.selector);
        esc.reclaimExpired();
    }

    // constructor guards
    function test_RevertWhen_ZeroFreelancer() public {
        uint256[] memory a = new uint256[](1); a[0] = 1 ether;
        vm.expectRevert("freelancer=0");
        new MilestoneEscrow(address(0), a, block.timestamp + 1 days);
    }
    function test_RevertWhen_DeadlinePast() public {
        uint256[] memory a = new uint256[](1); a[0] = 1 ether;
        vm.expectRevert("deadline in past");
        new MilestoneEscrow(freelancer, a, block.timestamp);
    }
    function test_RevertWhen_NoMilestones() public {
        uint256[] memory a = new uint256[](0);
        vm.expectRevert("no milestones");
        new MilestoneEscrow(freelancer, a, block.timestamp + 1 days);
    }
    function test_RevertWhen_ZeroAmount() public {
        uint256[] memory a = new uint256[](1); a[0] = 0;
        vm.expectRevert("amount=0");
        new MilestoneEscrow(freelancer, a, block.timestamp + 1 days);
    }

    // transfer-failure branch: freelancer is a contract that rejects ETH
    function test_Claim_TransferFails_Reverts() public {
        RejectEther bad = new RejectEther();
        uint256[] memory a = new uint256[](1); a[0] = 1 ether;
        vm.prank(client);
        MilestoneEscrow e2 = new MilestoneEscrow(address(bad), a, block.timestamp + 1 days);
        vm.prank(client); e2.fund{value: 1 ether}();
        vm.prank(client); e2.approveMilestone(0);
        vm.prank(address(bad));
        vm.expectRevert(MilestoneEscrow.TransferFailed.selector);
        e2.claim(0);
    }
}
