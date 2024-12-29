import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client';
import { getAccountFromProvider } from '@aleph-sdk/ethereum';

export let alephClient = null;

export async function initializeAlephClient() {
    if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install it.");
    }

    // Request wallet connection
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = await getAccountFromProvider(window.ethereum);

    // Initialize Aleph client
    alephClient = new AuthenticatedAlephHttpClient(account);
    console.log("Aleph client initialized with account:", account.address);

    return alephClient;
}

export function resetAlephClient() {
    alephClient = null;
    nodeGrid.innerHTML = '';
}


