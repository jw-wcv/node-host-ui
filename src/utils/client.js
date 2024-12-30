// client.js
import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client';
import { getAccountFromProvider } from '@aleph-sdk/ethereum';
import { nodeGrid } from './ui';

export let alephClient = null; 
export let account = null;     
let initializingClient = false;

/**
 * Initializes the Aleph client with an already known "account".
 * Does NOT ask MetaMask for permission. If "account" is not set, it throws.
 */
export async function initializeAlephClient() {
  if (alephClient) return alephClient; // Already ready

  if (initializingClient) {
    console.log("Aleph client is already being initialized.");
    while (!alephClient) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return alephClient;
  }

  initializingClient = true;
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not found. Please install it.");
    }

    if (!account) {
      // We rely on connectWallet() or autoConnectIfAuthorized() to set 'account'
      throw new Error("No wallet account is set. Please connect your wallet first.");
    }

    alephClient = new AuthenticatedAlephHttpClient(account);
    console.log("Aleph client initialized with account:", account.address);
    return alephClient;
  } catch (error) {
    console.error("Error initializing Aleph client:", error.message, error.stack);
    alert("Failed to initialize Aleph client. Please ensure your wallet is connected.");
    throw error;
  } finally {
    initializingClient = false;
  }
}

/**
 * Resets the Aleph client and clears account. 
 */
export function resetAlephClient() {
  alephClient = null;
  nodeGrid.innerHTML = '';
  account = null;
}

/**
 * If alephClient is null, tries to initialize. 
 * If there's no 'account' set, it throws an error telling user to connect first.
 */
export async function getOrInitializeAlephClient() {
  if (!alephClient) {
    console.log("Aleph client not initialized. Attempting now...");
    await initializeAlephClient();
  }
  if (!alephClient) {
    throw new Error("Failed to initialize Aleph client. Please connect your wallet first.");
  }
  return alephClient;
}
