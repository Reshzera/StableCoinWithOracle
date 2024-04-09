// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleConsumer {
    event Updated(
        uint256 indexed timestamp,
        uint256 oldSupply,
        uint256 newSupply
    );

    function updateWeiRatio(uint256 newRatio) external;
}
