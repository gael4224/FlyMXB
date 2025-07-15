// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MXNBToken
 * @dev Token ERC20 mock para MXNB (Peso Mexicano Digital)
 */
contract MXNBToken is ERC20, Ownable {
    uint8 private _decimals = 6; // 6 decimales como el peso mexicano

    constructor() ERC20("Mexican Peso Digital", "MXNB") Ownable(msg.sender) {
        // Mint inicial de tokens para el owner
        _mint(msg.sender, 1000000 * 10**decimals()); // 1 millón de MXNB
    }

    /**
     * @dev Mint tokens (solo owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Override decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
} 