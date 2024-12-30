// wallet.js

import { ethers } from 'ethers';
import { initializeAlephClient, resetAlephClient, account } from './client.js';
import { clearNodeGrid, showLoadingSpinner, hideWalletOverlay, showWalletOverlay } from './ui.js';
import { resetCharts } from './metrics.js';
import { listInstances } from './aleph.js';

/**
 * Attempt to connect if the user has previously granted permission.
 * 1) Calls eth_accounts => no popup.
 * 2) If an account is available, sets "account" in client.js
 * 3) Then calls initializeAlephClient() to build the Aleph client
 */
export async function autoConnectIfAuthorized() {
  if (!window.ethereum) {
    console.warn("MetaMask not found. Skipping auto-connect.");
    return;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts(); 
    // or: await window.ethereum.request({ method: 'eth_accounts' });

    if (accounts.length > 0) {
      // We have an authorized account, so let's set it
      console.log("User already has site authorized. Using account:", accounts[0]);

      const signer = provider.getSigner();
      const address = accounts[0];
      
      // Set the 'account' for Aleph
      account.address = address; 
      account.sign = async (msg) => await signer.signMessage(msg);

      // or we might do something like 
      // account = await getAccountFromProvider(window.ethereum);
      // if getAccountFromProvider can be told not to request accounts again 
      // but typically it tries to sign

      // Initialize the Aleph client
      await initializeAlephClient();

      // Update the UI
      const walletDisplay = document.getElementById('walletDisplay');
      const balanceDisplay = document.getElementById('balanceDisplay');
      walletDisplay.textContent = `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
      balanceDisplay.textContent = `Balance: Fetching...`;

      const balance = await fetchTokenBalance(provider, address);
      balanceDisplay.textContent = `Balance: ${balance} ALEPH`;

      // Switch button to "Disconnect"
      const connectWalletButton = document.getElementById('connectWalletButton');
      connectWalletButton.textContent = 'Disconnect Wallet';
      connectWalletButton.onclick = disconnectWallet;

      // Possibly fetch instances, hide overlay, etc.
      await listInstances();
      hideWalletOverlay();
    } else {
      console.log("No authorized accounts found. The user hasn't connected yet.");
      // Do nothing -> user must click "Connect" to show a popup
    }
  } catch (error) {
    console.error("Auto-connect check failed:", error);
  }
}

/**
 * Explicit "Connect Wallet" flow. 
 * 1) Calls eth_requestAccounts => triggers MetaMask popup if not connected
 * 2) Sets up signer and address in client.js's "account"
 * 3) Initialize Aleph client
 * 4) Update UI
 */
export async function connectWallet() {
  if (!window.ethereum) {
    alert('MetaMask is required to use this application.');
    throw new Error('MetaMask not detected');
  }

  try {
    showWalletOverlay();

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    // This always triggers a popup if user hasn't connected
    await provider.send('eth_requestAccounts', []);
    
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    console.log('Wallet connected explicitly:', address);

    // Set "account" for aleph usage
   // account.address = address;
   // account.sign = async (msg) => await signer.signMessage(msg);

    // Now build the Aleph client
    await initializeAlephClient();

    // Update UI
    const walletDisplay = document.getElementById('walletDisplay');
    const balanceDisplay = document.getElementById('balanceDisplay');
    walletDisplay.textContent = `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
    balanceDisplay.textContent = 'Balance: Fetching...';

    const balance = await fetchTokenBalance(provider, address);
    balanceDisplay.textContent = `Balance: ${balance} ALEPH`;

    // Switch to "Disconnect"
    const connectWalletButton = document.getElementById('connectWalletButton');
    connectWalletButton.textContent = 'Disconnect Wallet';
    connectWalletButton.onclick = disconnectWallet;

    // Hide overlay, fetch instances, etc.
    hideWalletOverlay();
    await listInstances();

  } catch (error) {
    console.error('Error connecting wallet:', error);
    showWalletOverlay();
  }
}

/**
 * Disconnect - Clear UI and attempt to remove permissions.
 */
export async function disconnectWallet() {
  const walletDisplay = document.getElementById('walletDisplay');
  const balanceDisplay = document.getElementById('balanceDisplay');
  const connectWalletButton = document.getElementById('connectWalletButton');

  walletDisplay.textContent = 'Wallet: Not Connected';
  balanceDisplay.textContent = 'Balance: 0 ALEPH';

  connectWalletButton.textContent = 'Connect Wallet';
  connectWalletButton.onclick = connectWallet;

  // Clear Aleph client
  resetAlephClient();
  clearNodeGrid();
  resetCharts();
  showWalletOverlay();

  try {
    // await disconnectWeb3Wallets();
    console.log('Web3 wallet disconnected successfully');
  } catch (error) {
    console.warn('Failed to disconnect Web3 wallet:', error);
  }
}

/**
 * Attempt to remove the permission from MetaMask.
 * If the user doesn't confirm or if there's a pending request, 
 * we might get a -32002 error.
 */
export async function disconnectWeb3Wallets() {
  if (window.ethereum?.request) {
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.error('Error disconnecting Web3 wallet:', error);
    }
  }
}

/**
 * Example fetch token balance function
 */
export async function fetchTokenBalance(provider, address) {
  const tokenAddress = '0x27702a26126e0B3702af63Ee09aC4d1A084EF628';
  const tokenABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];
  const contract = new ethers.Contract(tokenAddress, tokenABI, provider);
  const balance = await contract.balanceOf(address);
  const decimals = await contract.decimals();
  return ethers.utils.formatUnits(balance, decimals);
}
