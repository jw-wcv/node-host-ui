import { ethers } from 'ethers';
import { initializeAlephClient, resetAlephClient } from './client.js';
import { showWalletOverlay, hideWalletOverlay } from './ui.js';
import { listInstances } from './aleph.js';

// Connect wallet
export async function connectWallet() {
    if (!window.ethereum) {
        alert('MetaMask is required to use this application.');
        throw new Error('MetaMask not detected');
    }

    try {
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

        // Update wallet UI
        const walletDisplay = document.getElementById('walletDisplay');
        const balanceDisplay = document.getElementById('balanceDisplay');
        const connectWalletButton = document.getElementById('connectWalletButton');

        walletDisplay.textContent = `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
        const balance = await fetchTokenBalance(provider, address);
        balanceDisplay.textContent = `Balance: ${balance} ALEPH`;

        // Update button to "Disconnect"
        connectWalletButton.textContent = 'Disconnect';
        connectWalletButton.onclick = disconnectWallet;

        await listInstances();
        hideWalletOverlay();
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

    // Reset Aleph client and node grid
    resetAlephClient();

    walletOverlay.classList.add('visible');

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
