-include .env

.PHONY: build test fmt snapshot deploy upgrade

RPC      ?= $(CELO_RPC)
PROXY    ?= $(PROXY_ADDRESS)
CHAIN_ID  = 42220

# ── Build & Test ─────────────────────────────────────────────────────────────

build:
	forge build --sizes

test:
	forge test -v

test-gas:
	forge test --gas-report

snapshot:
	forge snapshot

fmt:
	forge fmt

fmt-check:
	forge fmt --check

# ── Deploy & Upgrade ─────────────────────────────────────────────────────────

deploy:
	forge script script/Deploy.s.sol \
	  --rpc-url $(RPC) \
	  --chain-id $(CHAIN_ID) \
	  --legacy \
	  --broadcast \
	  --verify

upgrade:
	PROXY_ADDRESS=$(PROXY) forge script script/Upgrade.s.sol \
	  --rpc-url $(RPC) \
	  --chain-id $(CHAIN_ID) \
	  --legacy \
	  --broadcast \
	  --verify

# ── Admin ─────────────────────────────────────────────────────────────────────

set-token:
	@echo "Usage: make set-token TOKEN_ADDRESS=0x... TOKEN_ALLOWED=true"
	PROXY_ADDRESS=$(PROXY) TOKEN_ADDRESS=$(TOKEN_ADDRESS) TOKEN_ALLOWED=$(TOKEN_ALLOWED) \
	forge script script/SetAllowedToken.s.sol \
	  --rpc-url $(RPC) --chain-id $(CHAIN_ID) --legacy --broadcast

set-fee:
	@echo "Usage: make set-fee FEE_BPS=250 FEE_RECIPIENT=0x..."
	PROXY_ADDRESS=$(PROXY) FEE_BPS=$(FEE_BPS) FEE_RECIPIENT=$(FEE_RECIPIENT) \
	forge script script/SetFee.s.sol \
	  --rpc-url $(RPC) --chain-id $(CHAIN_ID) --legacy --broadcast

get-task:
	@echo "Usage: make get-task TASK_ID=1"
	PROXY_ADDRESS=$(PROXY) TASK_ID=$(TASK_ID) \
	forge script script/GetTask.s.sol \
	  --rpc-url $(RPC)
