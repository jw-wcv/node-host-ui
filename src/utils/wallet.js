// wallet.js

import { ethers } from 'ethers';
import { initializeAlephClient, resetAlephClient } from './client.js';
import { clearNodeGrid, showLoadingSpinner, hideWalletOverlay, showWalletOverlay } from './ui.js';
import { resetCharts } from './metrics.js';
import { listInstances } from './aleph.js';

// Connect wallet
export async function connectWallet() {
    if (!window.ethereum) {
        alert('MetaMask is required to use this application.');
        throw new Error('MetaMask not detected');
    }

    try {
        // Display loading spinner during connection
        showWalletOverlay();

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        console.log('Wallet connected:', address);

        // Initialize Aleph client
        await initializeAlephClient({
            address,
            sign: async (msg) => await signer.signMessage(msg),
        });

        // Update UI with wallet details
        const walletDisplay = document.getElementById('walletDisplay');
        const balanceDisplay = document.getElementById('balanceDisplay');
        walletDisplay.textContent = `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
        balanceDisplay.textContent = `Balance: Fetching...`;

        // Fetch and display balance
        const balance = await fetchTokenBalance(provider, address);
        balanceDisplay.textContent = `Balance: ${balance} ALEPH`;

        // Change button to "Disconnect Wallet"
        const connectWalletButton = document.getElementById('connectWalletButton');
        connectWalletButton.textContent = 'Disconnect Wallet';
        connectWalletButton.onclick = disconnectWallet;

        // Fetch instances and load charts
        hideWalletOverlay();
        await listInstances();
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showWalletOverlay();
    }
}


// Disconnect wallet
export async function disconnectWallet() {
    const walletDisplay = document.getElementById('walletDisplay');
    const balanceDisplay = document.getElementById('balanceDisplay');
    const connectWalletButton = document.getElementById('connectWalletButton');
    const walletOverlay = document.getElementById('walletOverlay');

    walletDisplay.textContent = 'Wallet: Not Connected';
    balanceDisplay.textContent = 'Balance: 0 ALEPH';

    connectWalletButton.textContent = 'Connect Wallet';
    connectWalletButton.onclick = connectWallet;

    // Clear UI
    resetAlephClient();
    clearNodeGrid();
    resetCharts();
    showWalletOverlay();

    try {
        await disconnectWeb3Wallets();
        console.log('Web3 wallet disconnected successfully');
    } catch (error) {
        console.warn('Failed to disconnect Web3 wallet:', error);
    }
}

// Utility to disconnect Web3 wallet
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

// Fetch token balance
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
