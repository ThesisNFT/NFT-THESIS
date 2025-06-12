# Thesis Smart Contracts

This project is a Hardhat-based Ethereum smart contract suite designed for managing NFTs, auctions, and staking with discount features. It demonstrates a complete flow from NFT minting to auctioning and staking-based discounts.

## Project Overview

The project consists of three main smart contracts:

- **ThesisNFT**: An ERC721 NFT contract that supports minting up to a maximum supply, with auction start logic triggered when max supply is reached. It integrates with a staking contract to offer discounted minting prices.
- **ThesisAuction**: An Ownable auction contract that manages the auction of NFTs from the ThesisNFT contract. It supports depositing NFTs, starting/stopping auctions, setting auction prices, and buying NFTs.
- **Staking**: An ERC20 staking contract that allows users to stake tokens to become eligible for discounts on NFT minting. It manages stakes, minimum stake requirements, and discount percentages.

## Deployment and Testnets

The contracts are intended for deployment on the following testnets:

- SepoliaETH (chainId: 11155111)
- tCORE2 (chainId: 1114)

These are configured in the `hardhat.config.ts` file.

## Usage Instructions

Try running some of the following Hardhat tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

## Contract Details

### ThesisNFT

- ERC721 contract with configurable max and min supply.
- Minting is allowed until the auction starts.
- Integrates with the Staking contract to provide discounted minting prices for eligible users.
- Emits events for minting and auction start.
- Owner can set base URI for token metadata and update price before auction starts.

### ThesisAuction

- Ownable contract managing NFT auctions.
- Owner can deposit NFTs to the auction contract.
- Supports starting and stopping the auction.
- Allows setting auction price.
- Buyers can purchase NFTs by sending ETH equal to or greater than the auction price.
- Emits events for auction lifecycle and NFT sales.

### Staking

- Ownable ERC20 staking contract.
- Users can stake tokens to become eligible for discounts.
- Tracks stakes per user and minimum stake required.
- Owner can update minimum stake and discount percentage.
- Provides a function to check if a user has a discount.

## Notes

- The auction contract and NFT contract are tightly integrated; the auction can only start after the NFT contract signals the auction has started.
- The staking contract discount feature is currently commented out in the NFT contract but can be enabled for discounted minting.
- Ensure to configure contract addresses and parameters correctly before deployment.
