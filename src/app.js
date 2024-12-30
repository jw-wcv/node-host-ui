// Import modules
import { connectWallet, disconnectWallet } from './utils/wallet.js';
import { createInstance, deleteNode, configureNode, pingNode } from './utils/aleph.js';
import { createSSHKey } from './utils/ssh.js';
import { showWalletOverlay } from './utils/ui.js';
import { nodeGrid } from './utils/ui.js';
import './styles.css';

// UI elements
const connectWalletButton = document.getElementById('connectWalletButton');
const overlayConnectWalletButton = document.getElementById('overlayConnectWalletButton');
const createNodeButton = document.querySelector('.create-node-button');
const createSSHButton = document.querySelector('.create-ssh-button');

let walletConnected = false; // Track if already connected
let isConnecting = false; // Prevent multiple clicks


// Ensure there is no duplicate event listener for the "Connect Wallet" button
connectWalletButton.removeEventListener('click', handleWalletConnect);
connectWalletButton.addEventListener('click', handleWalletConnect);

// Main connect/disconnect wallet logic
async function handleWalletConnect() {
    if (isConnecting) return; // Skip if already connecting
    isConnecting = true;

    try {
        if (!walletConnected) {
            // Connect wallet
            await connectWallet();
            walletConnected = true; // Set the wallet as connected
        } else {
            // Disconnect wallet
            await disconnectWallet();
            walletConnected = false; // Set the wallet as disconnected
        }
    } catch (error) {
        console.error('Error handling wallet connection:', error);
        showWalletOverlay(); // Show overlay in case of failure
    } finally {
        isConnecting = false; // Reset the flag
    }
}

// Add a listener for the overlay "Connect Wallet" button
overlayConnectWalletButton.removeEventListener('click', handleOverlayConnect);
overlayConnectWalletButton.addEventListener('click', handleOverlayConnect);

// Event handler function for overlay wallet connection
async function handleOverlayConnect() {
    if (isConnecting) return; // Prevent multiple concurrent connections
    isConnecting = true;

    try {
        await connectWallet();
    } catch (error) {
        console.error('Error connecting wallet via overlay:', error);
        showWalletOverlay();
    } finally {
        isConnecting = false; // Reset the connection flag
    }
}

createNodeButton.addEventListener('click', createInstance);
createSSHButton.addEventListener('click', createSSHKey);

// Check wallet connection on page load
window.addEventListener('load', async () => {
    try {
        if (!walletConnected) showWalletOverlay();
    } catch (error) {
        console.warn('Wallet not connected on page load:', error);
        showWalletOverlay();
    }
});

// Node actions (event delegation for dynamically added elements)
nodeGrid.addEventListener('click', async (event) => {
    const button = event.target;
    const card = button.closest('.card');
    const nodeId = card?.getAttribute('data-id');
    const ipv6 = card?.querySelector('p').textContent.split(': ')[1];

    if (button.classList.contains('delete-button')) {
        await deleteNode(nodeId);
    } else if (button.classList.contains('ping-button')) {
        await pingNode(ipv6, button);
    } else if (button.classList.contains('configure-button')) {
        await configureNode(ipv6, nodeId);
    }
});
