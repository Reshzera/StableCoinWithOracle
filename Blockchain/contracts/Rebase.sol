// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./IOracle.sol";
import "./IOracleConsumer.sol";
import "./IUsdEth.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Rebase is IOracleConsumer, Ownable, Pausable {
    address public immutable usdEth;
    address public oracle;
    uint public lastUpdateWeiRatio;
    uint private updateTolrance = 120; // 2 minutes

    constructor(address _usdEth, address _oracle) Ownable(msg.sender) {
        usdEth = _usdEth;
        oracle = _oracle;
        _pause();
    }

    function initialize(uint weisPerPenny) external payable onlyOwner {
        require(weisPerPenny > 0, "Invalid weisPerPenny");
        require(msg.value >= weisPerPenny, "Invalid msg.value");

        IUsdEth(usdEth).mint(msg.sender, msg.value / weisPerPenny);
        lastUpdateWeiRatio = block.timestamp;
    }

    function getParity(uint weisPerPenny) public view returns (uint) {
        if (weisPerPenny == 0) weisPerPenny = IOracle(oracle).getWeiRatio();
        return
            (IUsdEth(usdEth).totalSupply() * 100) /
            (address(this).balance / weisPerPenny);
    }

    function ajustSupply(uint weisPerPenny) internal returns (uint) {
        uint parity = getParity(weisPerPenny);
        IUsdEth _usdEth = IUsdEth(usdEth);
        uint _prevTotalSupply = _usdEth.totalSupply();
        if (parity == 0) {
            _pause();
            return 0;
        }

        if (parity == 100) {
            return _prevTotalSupply;
        }

        if (parity > 100) {
            _usdEth.burn(owner(), (_prevTotalSupply * (parity - 100)) / 100);
        }

        if (parity < 100) {
            _usdEth.mint(owner(), (_prevTotalSupply * (100 - parity)) / 100);
        }

        return _usdEth.totalSupply();
    }

    function setOracleAddress(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid newOracle");
        oracle = newOracle;
    }

    function setUpdateTolerance(uint newTolrance) external onlyOwner {
        require(newTolrance > 0, "Invalid newTolrance");
        updateTolrance = newTolrance;
    }

    function updateWeiRatio(uint256 newRatio) external {
        require(msg.sender == oracle, "Not authorized");
        uint oldSupply = IUsdEth(usdEth).totalSupply();
        uint newSupply = ajustSupply(newRatio);

        if (newSupply != 0) {
            emit Updated(block.timestamp, oldSupply, newRatio);
            lastUpdateWeiRatio = block.timestamp;
        }
    }

    function deposit() external payable whenNotPaused whenNotOutdated {
        uint weiRatio = IOracle(oracle).getWeiRatio();
        require(
            msg.value >= weiRatio,
            "With this amount you can't buy any USD cents"
        );
        uint usdCents = msg.value / weiRatio;
        IUsdEth(usdEth).mint(msg.sender, usdCents);
    }

    function withdrawInEth(uint amount) external whenNotPaused whenNotOutdated {
        uint weiRatio = IOracle(oracle).getWeiRatio();
        uint balanceOfInEth = IUsdEth(usdEth).balanceOf(msg.sender) * weiRatio;
        require(balanceOfInEth >= amount, "Not enough balance");
        uint usdCents = amount / weiRatio;
        IUsdEth(usdEth).burn(msg.sender, usdCents);
    }

    function withdrawInUsd(uint amount) external whenNotPaused whenNotOutdated {
        uint balanceOf = IUsdEth(usdEth).balanceOf(msg.sender);
        require(balanceOf >= amount, "Not enough balance");
        IUsdEth(usdEth).burn(msg.sender, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    modifier whenNotOutdated() {
        require(
            updateTolrance >= block.timestamp - lastUpdateWeiRatio,
            "Outdated"
        );
        _;
    }
}
