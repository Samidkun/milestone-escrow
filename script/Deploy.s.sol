// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

contract DeployMilestoneEscrow is Script {
    function run() external returns (MilestoneEscrow esc) {
        address freelancer = vm.envOr("FREELANCER", msg.sender);
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1 ether; amounts[1] = 2 ether; amounts[2] = 3 ether;
        uint256 deadline = block.timestamp + 30 days;

        vm.startBroadcast();
        esc = new MilestoneEscrow(freelancer, amounts, deadline);
        vm.stopBroadcast();

        console2.log("DEPLOYED_AT", address(esc));
        console2.log("client", esc.client());
        console2.log("freelancer", esc.freelancer());
        console2.log("totalFunded", esc.totalFunded());
    }
}
