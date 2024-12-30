// app.js

// Import modules
import {
    autoConnectIfAuthorized, 
    connectWallet, 
    disconnectWallet
  } from './utils/wallet.js';
  import { createInstance, deleteNode } from './utils/aleph.js';
  import { pingNode, configureNode } from './utils/nodes.js';
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
  
  // 1. Only keep an explicit connect or auto-connect, not both
  //    But let's assume you do both: auto-check if user is already authorized on page load
  
  // On page load, try auto-connect without showing a popup
  window.addEventListener('load', async () => {
    try {
      // If you want to hide the overlay initially, do so:
      // hideWalletOverlay(); // if you have a function for that
      await autoConnectIfAuthorized();
      if (!walletConnected) {
        // If autoConnectIfAuthorized found no account,
        // show the overlay so user can connect or ignore
        showWalletOverlay();
      }
    } catch (error) {
      console.warn('Wallet not connected on page load:', error);
      showWalletOverlay();
    }
  });
  
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Ensuring all DOM elements are accessible");
    console.log("powerDial:", document.getElementById('powerDial'));
    console.log("availableComputeChart:", document.getElementById('availableComputeChart'));
    console.log("nodeGrid:", document.getElementById('nodeGrid'));
  });
  
  // 2. Replace your “Connect Wallet” logic with the new connect method
  connectWalletButton.removeEventListener('click', handleWalletConnect);
  connectWalletButton.addEventListener('click', handleWalletConnect);
  
  // Main connect/disconnect wallet logic
  async function handleWalletConnect() {
    if (isConnecting) return;
    isConnecting = true;
  
    try {
      if (!walletConnected) {
        // 2a. Use your explicit connect method
        await connectWallet();
        walletConnected = true;
      } else {
        // 2b. Disconnect
        await disconnectWallet();
        walletConnected = false;
      }
    } catch (error) {
      console.error('Error handling wallet connection:', error);
      showWalletOverlay();
    } finally {
      isConnecting = false;
    }
  }
  
  // 3. Overlay “Connect” button
  overlayConnectWalletButton.removeEventListener('click', handleOverlayConnect);
  overlayConnectWalletButton.addEventListener('click', handleOverlayConnect);
  
  async function handleOverlayConnect() {
    if (isConnecting) return;
    isConnecting = true;
  
    try {
      await connectWallet();
      walletConnected = true;
    } catch (error) {
      console.error('Error connecting wallet via overlay:', error);
      showWalletOverlay();
    } finally {
      isConnecting = false;
    }
  }
  
  // The rest of your code for createInstance, createSSHKey, node actions, etc., can remain
  createNodeButton.removeEventListener('click', handleCreateInstance);
  createNodeButton.addEventListener('click', handleCreateInstance);
  
  createSSHButton.removeEventListener('click', handleCreateSSHKey);
  createSSHButton.addEventListener('click', handleCreateSSHKey);
  
  async function handleCreateInstance() {
    try {
      await createInstance();
    } catch (error) {
      console.error('Error creating instance:', error);
    }
  }
  
  async function handleCreateSSHKey() {
    try {
      createSSHKey();
    } catch (error) {
      console.error('Error creating SSH key:', error);
    }
  }
  
  // Node actions (event delegation)
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
  