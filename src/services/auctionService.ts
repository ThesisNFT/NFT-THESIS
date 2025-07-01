import Web3 from "web3";
import { CONTRACT_ADDRESSES } from "../config/contractAddresses";
import ThesisAuctionABI from "../abis/ThesisAuction.json";
import { NFTContractService, MintedNFT } from './nftContractService';
import type { Contract } from 'web3-eth-contract';
import type { AbiItem } from 'web3-utils';
import type { EventLog } from 'web3-eth-contract';

export interface AuctionConfig {
  startingPrice: number;
  reservePrice: number;
  duration: number; // in hours
  onlyMintersCanBid: boolean;
  escrowEnabled: boolean;
}

export interface Bid {
  bidder: string;
  amount: number;
  timestamp: Date;
  transactionHash: string;
}

export interface Auction {
  id: string;
  nftTokenId: string;
  seller: string;
  config: AuctionConfig;
  bids: Bid[];
  startTime: Date;
  endTime: Date;
  status: 'active' | 'ended' | 'cancelled';
  winner?: string;
  finalPrice?: number;
  escrowFunds: Map<string, number>;
}

export class AuctionService {
  private static instance: AuctionService;
  private web3: Web3;
  private contract: Contract<any>;
  private walletAddress: string | null = null;
  private auctions: Map<string, Auction> = new Map();
  private nftService = NFTContractService.getInstance();

  static getInstance(): AuctionService {
    if (!AuctionService.instance) {
      AuctionService.instance = new AuctionService();
    }
    return AuctionService.instance;
  }

  constructor() {
    this.web3 = new Web3(window.ethereum as typeof Web3.givenProvider);
    this.contract = new this.web3.eth.Contract(
      ThesisAuctionABI.abi,
      CONTRACT_ADDRESSES.thesisAuction
    );
  }

  async setWalletAddress(address: string) {
    this.walletAddress = address;
  }

  async createAuction(
    nftTokenId: string,
    seller: string,
    config: AuctionConfig
  ): Promise<string> {
    if (!this.walletAddress) {
      throw new Error("Wallet address not set");
    }

    const auctionId = `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (config.duration * 60 * 60 * 1000));

    const auction: Auction = {
      id: auctionId,
      nftTokenId,
      seller,
      config,
      bids: [],
      startTime,
      endTime,
      status: 'active',
      escrowFunds: new Map()
    };

    this.auctions.set(auctionId, auction);
    return auctionId;
  }

  async placeBid(auctionId: string, bidder: string, amount: number): Promise<boolean> {
    if (!this.walletAddress) {
      throw new Error("Wallet address not set");
    }

    const auction = this.auctions.get(auctionId);
    if (!auction) {
      throw new Error('Auction not found');
    }

    if (auction.status !== 'active') {
      throw new Error('Auction is not active');
    }

    if (new Date() > auction.endTime) {
      throw new Error('Auction has ended');
    }

    // Check if only minters can bid
    if (auction.config.onlyMintersCanBid) {
      const userNFTs = await this.nftService.getUserMintedNFTs();
      const hasNFTFromThesis = userNFTs.some(nft => 
        nft.tokenId.split('_')[0] === auction.nftTokenId.split('_')[0]
      );
      
      if (!hasNFTFromThesis) {
        throw new Error('Only minters of this thesis can participate in the auction');
      }
    }

    const currentHighestBid = auction.bids.length > 0 
      ? Math.max(...auction.bids.map(bid => bid.amount))
      : auction.config.startingPrice;

    if (amount <= currentHighestBid) {
      throw new Error('Bid must be higher than current highest bid');
    }

    if (amount < auction.config.reservePrice) {
      throw new Error('Bid must meet reserve price');
    }

    // Simulate escrow deposit
    await new Promise(resolve => setTimeout(resolve, 1500));

    const bid: Bid = {
      bidder,
      amount,
      timestamp: new Date(),
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
    };

    auction.bids.push(bid);
    
    // Add to escrow
    if (auction.config.escrowEnabled) {
      auction.escrowFunds.set(bidder, amount);
    }

    return true;
  }

  async endAuction(auctionId: string): Promise<Auction | null> {
    if (!this.walletAddress) {
      throw new Error("Wallet address not set");
    }

    const auction = this.auctions.get(auctionId);
    if (!auction) return null;

    auction.status = 'ended';
    
    if (auction.bids.length > 0) {
      const winningBid = auction.bids.reduce((highest, current) => 
        current.amount > highest.amount ? current : highest
      );
      
      auction.winner = winningBid.bidder;
      auction.finalPrice = winningBid.amount;

      // Release non-winner funds from escrow
      if (auction.config.escrowEnabled) {
        auction.escrowFunds.forEach((amount, bidder) => {
          if (bidder !== auction.winner) {
            // Simulate fund release
            console.log(`Releasing ${amount} CORE to ${bidder}`);
          }
        });
      }

      // Transfer NFT to winner and unblur it
      await this.nftService.unblurNFT(auction.nftTokenId);
    }

    return auction;
  }

  getActiveAuctions(): Auction[] {
    return Array.from(this.auctions.values()).filter(auction => 
      auction.status === 'active' && new Date() <= auction.endTime
    );
  }

  getAuction(auctionId: string): Auction | null {
    return this.auctions.get(auctionId) || null;
  }

  getUserBids(walletAddress: string): { auctionId: string; bid: Bid }[] {
    const userBids: { auctionId: string; bid: Bid }[] = [];
    
    this.auctions.forEach((auction, auctionId) => {
      const userBid = auction.bids.find(bid => bid.bidder === walletAddress);
      if (userBid) {
        userBids.push({ auctionId, bid: userBid });
      }
    });

    return userBids;
  }

  /**
   * Get the platform wallet address from the contract
   */
  async getPlatformWallet(): Promise<string> {
    return await this.contract.methods.platformWallet().call();
  }

  /**
   * Get the withdrawable balance for an address
   */
  async getWithdrawable(address: string): Promise<string> {
    return await this.contract.methods.withdrawable(address).call();
  }

  /**
   * Withdraw platform fees for the current wallet
   */
  async withdrawFunds(): Promise<void> {
    if (!this.walletAddress) {
      throw new Error("Wallet address not set");
    }
    await this.contract.methods.withdrawFunds().send({ from: this.walletAddress });
  }

  /**
   * Fetch all auctions from the contract (on-chain)
   */
  async fetchAllAuctions(): Promise<Auction[]> {
    const totalAuctions = await this.contract.methods.getTotalAuctions().call();
    const auctions: Auction[] = [];
    for (let i = 0; i < Number(totalAuctions); i++) {
      try {
        const info = await this.contract.methods.auctionInfo(i).call();
        if (
          info &&
          typeof info === 'object' &&
          'minter' in info &&
          'highestBid' in info &&
          'endTime' in info &&
          'startTime' in info &&
          'active' in info &&
          'isCancelled' in info &&
          'highestBidder' in info
        ) {
          auctions.push({
            id: String(i),
            nftTokenId: String(i),
            seller: String(info.minter) || '',
            config: {
              startingPrice: Number(info.highestBid) || 0,
              reservePrice: 0, // Not available in info
              duration: Number(info.endTime) && Number(info.startTime) ? Math.floor((Number(info.endTime) - Number(info.startTime)) / 3600) : 0,
              onlyMintersCanBid: false, // Not available in info
              escrowEnabled: false // Not available in info
            },
            bids: [], // To be filled by fetchAuctionBids
            startTime: new Date(Number(info.startTime) * 1000),
            endTime: new Date(Number(info.endTime) * 1000),
            status: info.active ? 'active' : (info.isCancelled ? 'cancelled' : 'ended'),
            winner: info.highestBidder ? String(info.highestBidder) : undefined,
            finalPrice: Number(info.highestBid) || undefined,
            escrowFunds: new Map(),
          });
        }
      } catch (e) {
        // skip if not found
      }
    }
    return auctions;
  }

  /**
   * Fetch bids for a specific auction from the contract
   */
  async fetchAuctionBids(tokenId: number): Promise<Bid[]> {
    const events = await this.contract.getPastEvents('BidRevealed', {
      filter: { tokenId: tokenId },
      fromBlock: 0,
      toBlock: 'latest'
    });

    const bids: Bid[] = [];
    events.forEach(event => {
      if (typeof event === 'object' && event.returnValues) {
        bids.push({
          bidder: event.returnValues.bidder as string,
          amount: parseFloat(this.web3.utils.fromWei(event.returnValues.amount as string, 'ether')),
          timestamp: new Date(Number(event.returnValues.timestamp) * 1000),
          transactionHash: event.transactionHash || ''
        });
      }
    });
    return bids;
  }

  /**
   * Fetch the winner for a specific auction from the contract
   */
  async fetchAuctionWinner(tokenId: number): Promise<string | null> {
    const events = await this.contract.getPastEvents('AuctionEnded', {
      filter: { tokenId: tokenId },
      fromBlock: 0,
      toBlock: 'latest'
    });

    const eventLog = events.find(e => typeof e === 'object' && e.returnValues);
    if (eventLog && typeof eventLog === 'object') {
      return eventLog.returnValues.winner as string;
    }
    
    return null;
  }

  /**
   * Fetch bids for a specific user from the contract
   */
  async fetchUserBids(userAddress: string): Promise<Bid[]> {
    const events = await this.contract.getPastEvents('BidRevealed', {
      filter: { bidder: userAddress },
      fromBlock: 0,
      toBlock: 'latest'
    });

    const bids: Bid[] = [];
    events.forEach(event => {
      if (typeof event === 'object' && event.returnValues) {
        bids.push({
          bidder: event.returnValues.bidder as string,
          amount: parseFloat(this.web3.utils.fromWei(event.returnValues.amount as string, 'ether')),
          timestamp: new Date(Number(event.returnValues.timestamp) * 1000),
          transactionHash: event.transactionHash || ''
        });
      }
    });
    return bids;
  }
}
