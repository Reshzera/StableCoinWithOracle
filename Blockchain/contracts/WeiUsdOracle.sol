// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./IOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IOracleConsumer.sol";

contract WeiUsdOracle is Ownable, IOracle {
    struct SubscriberMapping {
        bool isSubscribed;
        uint subscriberIndex;
    }
    uint private weiRatio;
    uint public lastUpdateWeiRatio;
    address[] public subscribers;
    mapping(address => SubscriberMapping) subscriberMapping; //address => subscriberIndex

    constructor(uint ethPriceInPenny) Ownable(msg.sender) {
        weiRatio = calcWeiRatio(ethPriceInPenny);
        lastUpdateWeiRatio = block.timestamp;
    }

    function setEthPrice(uint ethPriceInPenny) external onlyOwner {
        require(ethPriceInPenny > 0, "Invalid eth price");
        weiRatio = calcWeiRatio(ethPriceInPenny);
        require(weiRatio > 0, "Invalid wei ratio");
        lastUpdateWeiRatio = block.timestamp;
        bool someSubscriberUpdated = false;

        for (uint i = 0; i < subscribers.length; i++) {
            if (subscribers[i] != address(0)) {
                IOracleConsumer(subscribers[i]).updateWeiRatio(weiRatio);
                someSubscriberUpdated = true;
            }
        }

        if (someSubscriberUpdated) {
            emit AllUpdated(subscribers);
        }
    }

    function getWeiRatio() external view returns (uint) {
        return weiRatio;
    }

    function subscribe(address subscriber) external onlyOwner {
        require(subscriber != address(0), "Invalid subscriber address");
        require(
            !subscriberMapping[subscriber].isSubscribed,
            "Already subscribed"
        );

        emit Subscribed(subscriber);
        subscriberMapping[subscriber] = SubscriberMapping(
            true,
            subscribers.length
        );
        subscribers.push(subscriber);
    }

    function unsubscribe(address subscriber) external onlyOwner {
        require(subscriber != address(0), "Invalid subscriber address");
        require(
            subscriberMapping[subscriber].isSubscribed,
            "Not subscribed yet"
        );

        uint subscriberIndex = subscriberMapping[subscriber].subscriberIndex;
        delete subscribers[subscriberIndex];
        delete subscriberMapping[subscriber];
        emit Unsubscribed(subscriber);
    }

    function calcWeiRatio(uint ethPriceInPenny) internal pure returns (uint) {
        return (10 ** 18) / ethPriceInPenny;
    }
}
