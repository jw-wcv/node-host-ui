// client.js 

import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client';
import { getAccountFromProvider } from '@aleph-sdk/ethereum';
import { nodeGrid } from './ui';

export let alephClient = null; // Exported Aleph client
// client.js
export let account = {
    address: null,
    sign: null,
  };
let initializingClient = false;

/**
 * Initializes the Aleph client by requesting accounts from MetaMask.
 * If already initialized, returns the existing client.
 */
export async function initializeAlephClient() {
    // If we've already initialized, return the existing client.
    if (alephClient) return alephClient;
  
    // If initialization is in progress, wait until it's done.
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
  
      // 1) Explicitly ask MetaMask for permission to view accounts.
      await window.ethereum.request({ method: "eth_requestAccounts" });
  
      // 2) Once permission is granted, get the account from the provider.
      account = await getAccountFromProvider(window.ethereum);
  
      // 3) Use that account to create an AuthenticatedAlephHttpClient.
      alephClient = new AuthenticatedAlephHttpClient(account);
      console.log("Aleph client initialized with account:", account.address);
  
      return alephClient;
    } catch (error) {
      console.error("Error initializing Aleph client:", error.message, error.stack);
      alert("Failed to initialize Aleph client. Please ensure your wallet is connected and try again.");
      throw new Error("Aleph client initialization failed.");
    } finally {
      initializingClient = false;
    }
  }

/**
 * Resets the Aleph client and clears the UI, as well as the stored account.
 */
  export function resetAlephClient() {
    alephClient = null;
    nodeGrid.innerHTML = '';
    account = null;
  }
  
  /**
   * Checks if alephClient is null; if yes, calls initializeAlephClient() once.
   * If there's still no client after that, throws an error.
   */
  export async function getOrInitializeAlephClient() {
    if (!alephClient) {
      console.log("Aleph client is not initialized. Initializing...");
      await initializeAlephClient(); // Attempt to initialize the client
    }
  
    if (!alephClient) {
      throw new Error("Failed to initialize Aleph client. Please connect your wallet.");
    }
    return alephClient;
  }


