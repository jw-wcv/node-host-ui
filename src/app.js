// Import modules
import { connectWallet, disconnectWallet } from './utils/wallet.js';
import { listInstances, createInstance, deleteNode, configureNode, pingNode } from './utils/aleph.js';
import { createSSHKey } from './utils/ssh.js';
import { showWalletOverlay, hideWalletOverlay } from './utils/ui.js';
import './styles.css';

// UI elements
const connectWalletButton = document.getElementById('connectWalletButton');
const overlayConnectWalletButton = document.getElementById('overlayConnectWalletButton');
const createNodeButton = document.querySelector('.create-node-button');
const createSSHButton = document.querySelector('.create-ssh-button');
const nodeGrid = document.getElementById('nodeGrid');

let walletConnected = false; // Track if already connected
let isConnecting = false; // Prevent multiple clicks

// Event listeners
connectWalletButton.addEventListener('click', async () => {
    if (isConnecting) return; // Skip if already connecting
    isConnecting = true;

    try {
        if (connectWalletButton.textContent === 'Connect Wallet') {
            await connectWallet();
        } else {
            await disconnectWallet();
        }
    } catch (error) {
        console.error('Error handling wallet button:', error);
        showWalletOverlay();
    } finally {
        isConnecting = false; // Reset the flag
    }
});


overlayConnectWalletButton.addEventListener('click', async () => {
    try {
        await connectWallet();
    } catch (error) {
        console.error('Error connecting wallet via overlay:', error);
        showWalletOverlay();
    }
});

createNodeButton.addEventListener('click', createInstance);
createSSHButton.addEventListener('click', createSSHKey);

// Check wallet connection on page load
window.addEventListener('load', async () => {
    try {
        showWalletOverlay();
        // if (!walletConnected) {
           // walletConnected = true; // Prevent duplicate calls
           // await connectWallet();
       // }
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
