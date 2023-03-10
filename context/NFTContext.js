/* eslint-disable operator-linebreak */
/* eslint-disable indent */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable comma-dangle */
import React, { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import axios from 'axios';
import { create as ipfsHttpClient } from 'ipfs-http-client';

import { MarketAddress, MarketAddressABI } from './constants';

// info needed to be sent to IPFS when sending request
const projectId = process.env.NEXT_PUBLIC_IPFS_PROJECT_ID;
const projectSecret = process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET;
const auth = `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString(
  'base64'
)}`;
const options = {
  host: 'ipfs.infura.io',
  protocol: 'https',
  port: 5001,
  headers: {
    authorization: auth,
  },
};
const client = ipfsHttpClient(options);
// end point. Needed in next.config.js as well
const dedicatedEndPoint = process.env.NEXT_PUBLIC_IPFS_DEDICATED_ENDPOINT;
// ------------------------------

// function to create contract when the seller or creator is passed in
const fetchContract = (signerOrProvider) =>
  new ethers.Contract(MarketAddress, MarketAddressABI, signerOrProvider);

// Create a context which is simpler solution than Redux
// used when less data is needed to be shared
export const NFTContext = React.createContext();

export const NFTProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState('');
  const [isLoadingNFT, setIsLoadingNFT] = useState(false);
  const nftCurrency = 'MATIC';

  // function that checks if metamask is installed and connected
  // runs everytime the page loads
  const checkIfWalletIsConnected = async () => {
    if (!window.ethereum) return alert('Please install MetaMask first.');

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    if (accounts.length !== 0) {
      setCurrentAccount(accounts[0]);
    } else {
      console.log('No authorized account found');
      alert('Please connect to MetaMask.');
    }
  };

  // useEffect to run checkIfWalletIsConnected function when the page loads
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  // function to connect metamask
  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install MetaMask first.');

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setCurrentAccount(accounts[0]);

      window.location.reload();
    } catch (error) {
      console.log(error);
    }
  };

  // function that uploads to IPFS
  const uploadToIPFS = async (file) => {
    try {
      const added = await client.add({ content: file });

      const url = `${dedicatedEndPoint}/ipfs/${added.path}`;

      return url;
    } catch (error) {
      console.log('Error uploading file to IPFS: ', error);
    }
  };

  // function that will be called when the user wants to create a new NFT
  // called in createNFT() function
  const createSale = async (url, formInputPrice, isReselling, id) => {
    // set up the contract
    const web3modal = new Web3Modal();
    const connection = await web3modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    // who is making this NFT or sale
    const signer = provider.getSigner();
    // need to convert from number to Wei or Gwei
    const price = ethers.utils.parseUnits(formInputPrice, 'ether');
    const contract = fetchContract(signer);
    const listingPrice = await contract.getListingPrice();

    // check if user is listing or resslling and perform transaction
    // createToken and resellToken are functions in the contract
    const transaction = !isReselling
      ? await contract.createToken(url, price, {
          value: listingPrice.toString(),
        })
      : await contract.resellToken(id, price, {
          value: listingPrice.toString(),
        });

    setIsLoadingNFT(true);
    await transaction.wait();
  };

  const createNFT = async (formInput, fileUrl, router) => {
    // getting properties from formInput
    const { name, description, price } = formInput;
    // check if all data is present
    if (!name || !description || !price || !fileUrl) {
      return console.log('Missing form input values');
    }
    // makeing data into json
    const data = JSON.stringify({ name, description, image: fileUrl });

    try {
      // uploading to IPFS
      const added = await client.add(data);
      // console.log(1);
      // get link
      const url = `${dedicatedEndPoint}/ipfs/${added.path}`;
      // console.log(2);
      await createSale(url, price);
      // console.log(3);
      // go to home page
      router.push('/');
    } catch (error) {
      console.log('Error uploading file to IPFS: ', error);
    }
  };

  // fetches all the NFTs from the smart contract
  const fetchNFTs = async () => {
    setIsLoadingNFT(false);

    const provider = new ethers.providers.JsonRpcProvider(
      'https://rpc-mumbai.maticvigil.com/'
    );
    const contract = fetchContract(provider);
    const data = await contract.fetchMarketItems();
    // fetch all NFT simultaneously
    // map to get data from each NFT
    const items = await Promise.all(
      data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {
        const tokenURI = await contract.tokenURI(tokenId);
        // get the metadata from the NFT url
        const {
          data: { image, name, description },
        } = await axios.get(tokenURI);
        // need to convert from number to Wei or Gwei
        const price = ethers.utils.formatUnits(
          unformattedPrice.toString(),
          'ether'
        );

        // returning an object of data of each specific NFT
        return {
          price,
          tokenid: tokenId.toNumber(),
          seller,
          owner,
          image,
          name,
          description,
          tokenURI,
        };
      })
    );
    // items will be an array of objects
    return items;
  };

  const fetchMyNFTsOrListedNFTs = async (type) => {
    setIsLoadingNFT(false);

    // set up the contract
    const web3modal = new Web3Modal();
    const connection = await web3modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    // who is making this NFT or sale
    const signer = provider.getSigner();

    const contract = fetchContract(signer);

    const data =
      type === 'fetchItemsListed'
        ? await contract.fetchItemsListed()
        : await contract.fetchMyNFTs();

    // map to get data from each NFT
    const items = await Promise.all(
      data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {
        const tokenURI = await contract.tokenURI(tokenId);
        // get the metadata from the NFT url
        const {
          data: { image, name, description },
        } = await axios.get(tokenURI);
        // need to convert from number to Wei or Gwei
        const price = ethers.utils.formatUnits(
          unformattedPrice.toString(),
          'ether'
        );

        // returning an object of data of each specific NFT
        return {
          price,
          tokenid: tokenId.toNumber(),
          seller,
          owner,
          image,
          name,
          description,
          tokenURI,
        };
      })
    );

    // items will be an array of objects
    return items;
  };

  const buyNFT = async (nft) => {
    // set up the contract
    const web3modal = new Web3Modal();
    const connection = await web3modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    // who is making this NFT or sale
    const signer = provider.getSigner();
    const contract = fetchContract(signer);

    // need to convert from number to Wei or Gwei
    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether');

    const transaction = await contract.createMarketSale(nft.tokenid, {
      value: price,
    });

    setIsLoadingNFT(true);
    await transaction.wait();
    setIsLoadingNFT(false);
  };

  // returning the provider to be used in the app
  return (
    <NFTContext.Provider
      value={{
        nftCurrency,
        connectWallet,
        currentAccount,
        uploadToIPFS,
        createNFT,
        fetchNFTs,
        fetchMyNFTsOrListedNFTs,
        buyNFT,
        createSale,
        isLoadingNFT,
      }}
    >
      {children}
    </NFTContext.Provider>
  );
};
