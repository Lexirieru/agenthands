// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title  MockERC20
/// @notice Minimal ERC-20 token used exclusively in AgentHands test suites.
/// @dev    Mimics USDC on Celo (6 decimals) or any other token by passing the
///         desired `decimals_` at construction time. Exposes an unrestricted
///         `mint` function so tests can fund wallets without dealing with
///         real token issuance. Never deploy this contract to mainnet.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    /// @notice Deploys the mock token with a configurable decimal precision.
    /// @param name_     Token name (e.g. "USD Coin").
    /// @param symbol_   Token symbol (e.g. "USDC").
    /// @param decimals_ Decimal precision — use 6 to match Celo USDC, 18 for CELO ERC-20.
    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    /// @notice Returns the token's decimal precision as set at construction.
    /// @return The number of decimals (overrides the ERC-20 default of 18).
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /// @notice Mints `amount` tokens to `to`. No access control — test-only.
    /// @param to     Recipient address.
    /// @param amount Amount in the token's native decimals (e.g. 1e6 = 1 USDC).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
