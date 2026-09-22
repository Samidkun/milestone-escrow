#!/usr/bin/env bash
# E12 — deploy rehearsal on a LOCAL anvil (no internet, no real ETH).
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
cd "$(dirname "$0")/.."

echo "== E12 deploy rehearsal (anvil, local) =="
anvil --silent --port 8545 &
ANVIL_PID=$!
trap 'kill $ANVIL_PID 2>/dev/null' EXIT
sleep 2

RPC=http://127.0.0.1:8545
KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "--- deploy ---"
OUT=$(forge script script/Deploy.s.sol:DeployMilestoneEscrow --rpc-url $RPC --private-key $KEY --broadcast 2>&1)
echo "$OUT" | grep -E "DEPLOYED_AT|client |freelancer |totalFunded|ONCHAIN EXECUTION" || true
ADDR=$(echo "$OUT" | grep -oE "0x[0-9a-fA-F]{40}" | head -1)
echo "contract: $ADDR"

echo "--- post-deploy smoke test (cast) ---"
echo "client():         $(cast call $ADDR "client()(address)" --rpc-url $RPC)"
echo "freelancer():     $(cast call $ADDR "freelancer()(address)" --rpc-url $RPC)"
echo "totalFunded():    $(cast call $ADDR "totalFunded()(uint256)" --rpc-url $RPC)"
echo "funded():         $(cast call $ADDR "funded()(bool)" --rpc-url $RPC)"
echo "milestoneCount(): $(cast call $ADDR "milestoneCount()(uint256)" --rpc-url $RPC)"

CODE=$(cast code $ADDR --rpc-url $RPC)
if [ "${#CODE}" -gt 4 ]; then
  echo "✅ bytecode present (${#CODE} hex chars)"
else
  echo "❌ no bytecode at $ADDR"; exit 1
fi
echo "✅ E12 rehearsal OK"
