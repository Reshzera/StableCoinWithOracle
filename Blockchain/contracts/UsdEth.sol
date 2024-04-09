// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IUsdEth.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UsdEth is IUsdEth, ERC20, ERC20Burnable, Ownable {
    address private rebaseAddress;

    constructor() ERC20("USD/ETH", "USD/ETH") Ownable(msg.sender) {}

    function setRebaseAddress(address _rebaseAddress) external onlyOwner {
        rebaseAddress = _rebaseAddress;
    }

    function mint(address to, uint256 amount) external onlyAdmins {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyAdmins {
        _burn(from, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 2;
    }

    modifier onlyAdmins() {
        require(
            msg.sender == owner() || msg.sender == rebaseAddress,
            "Not authorized"
        );
        _;
    }
}
