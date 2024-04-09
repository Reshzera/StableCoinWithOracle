# Stablecoin Application with Oracle Integration

## Overview

This project integrates a stablecoin application with an oracle to maintain parity with ETH based on real-time market prices from Binance. The backend is developed in Node.js using Express, and the blockchain part is managed through a Hardhat project.

## Components

- **Backend (Node.js/Express)**: Utilizes Binance API for real-time ETH price monitoring and updates the oracle contract when significant price changes are detected.
- **Blockchain (Hardhat)**: Contains smart contracts for managing stablecoin operations and price updates through an oracle. Uses the Hardhat framework for compilation, testing, and deployment.

## Installation

Ensure you have Node.js and Yarn installed. Then, clone the repository and install the dependencies for both backend and blockchain parts:

```bash
cd backend
yarn install
cd ../blockchain
yarn install
```

## Running the Backend

Navigate to the backend directory and use the following commands:

```bash
yarn build   # Compile TypeScript to JavaScript
yarn start   # Start the production server
yarn dev     # Start the development server with hot reloading
```

## Blockchain Operations

In the blockchain directory, you can run the following commands:

```bash
yarn compile   # Compile the smart contracts
yarn test      # Run tests with coverage
yarn start     # Start a local Hardhat node
yarn deploy:dev     # Deploy contracts to local development network
yarn deploy:sepolia # Deploy contracts to the Sepolia test network
```

## Additional Information

The backend API does not interact directly with the `Rebase.sol` contract but with the `WeiUsdOracle.sol` contract, which, when updated, triggers the rebasing mechanism in `Rebase.sol` to adjust token issuance based on the current ETH price.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
