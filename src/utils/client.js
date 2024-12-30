// client.js 

import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client';
import { getAccountFromProvider } from '@aleph-sdk/ethereum';
import { nodeGrid } from './ui';

export let alephClient = null; // Exported Aleph client
export let account = null; // Exported account object
let initializingClient = false;

export async function initializeAlephClient() {
    if (alephClient) return alephClient; // Return if already initialized
    if (initializingClient) {
        console.log("Aleph client is already being initialized.");
        while (!alephClient) {
            await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for initialization
        }
        return alephClient;
    }

    initializingClient = true;

    try {
        if (!window.ethereum) {
            throw new Error("MetaMask not found. Please install it.");
        }

        await window.ethereum.request({ method: "eth_requestAccounts" });
        account = await getAccountFromProvider(window.ethereum);

        alephClient = new AuthenticatedAlephHttpClient(account);
        console.log("Aleph client initialized with account:", account.address);

        return alephClient;
    } finally {
        initializingClient = false;
    }
}

export function resetAlephClient() {
    alephClient = null;
    nodeGrid.innerHTML = '';
    account = null;
}

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


