// Import dependencies
import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client';
import { Web3Account } from '@aleph-sdk/accounts';
import { ethers } from 'ethers';

const walletDisplay = document.getElementById('walletDisplay');
const balanceDisplay = document.getElementById('balanceDisplay');
const connectWalletButton = document.getElementById('connectWalletButton');
const nodeGrid = document.getElementById('nodeGrid');

let alephClient;
let alephAccount;

const alephChannel = "ALEPH-CLOUDSOLUTIONS";
const alephNodeUrl = "https://46.255.204.193";

async function connectWallet() {
  if (!window.ethereum) {
    alert('MetaMask is required to use this application.');
    return;
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  try {
    alephAccount = new Web3Account({
      address,
      sign: async (msg) => await signer.signMessage(msg),
    });

    alephClient = new AuthenticatedAlephHttpClient({
      account: alephAccount,
      node_url: alephNodeUrl,
    });

    walletDisplay.textContent = `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
    balanceDisplay.textContent = `Balance: Fetching...`;

    const balance = await fetchTokenBalance(provider, address);
    balanceDisplay.textContent = `Balance: ${balance} ALEPH`;

    connectWalletButton.textContent = 'Disconnect';
    connectWalletButton.onclick = disconnectWallet;

    await listInstances();
  } catch (error) {
    console.error("Error connecting wallet:", error);
  }
}

async function fetchTokenBalance(provider, address) {
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

async function listInstances() {
  if (!alephClient) return;

  const response = await alephClient.getMessages({
    types: ['INSTANCE'],
    addresses: [alephAccount.address],
  });

  nodeGrid.innerHTML = '';
  for (const message of response.messages) {
    const instanceId = message.item_hash;
    const ipv6 = await fetchInstanceIp(instanceId);
    renderNode({
      id: instanceId,
      ipv6: ipv6 || 'Unavailable',
      status: message.confirmed ? 'Running' : 'Pending',
      uptime: '0h 0m',
    });
  }
}

async function fetchInstanceIp(instanceId) {
  const response = await fetch(`https://scheduler.api.aleph.cloud/api/v0/allocation/${instanceId}`);
  const data = await response.json();
  return data.vm_ipv6 || null;
}

function renderNode(node) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h3>${node.id}</h3>
    <p><strong>IPv6:</strong> ${node.ipv6}</p>
    <p><strong>Status:</strong> ${node.status}</p>
    <p><strong>Uptime:</strong> ${node.uptime}</p>
    <div class="card-actions">
      <button onclick="deleteNode('${node.id}')">Delete</button>
    </div>
  `;
  nodeGrid.appendChild(card);
}

function disconnectWallet() {
  walletDisplay.textContent = 'Wallet: Not Connected';
  balanceDisplay.textContent = 'Balance: 0 ALEPH';
  connectWalletButton.textContent = 'Connect Wallet';
  connectWalletButton.onclick = connectWallet;
  nodeGrid.innerHTML = '';
}

connectWalletButton.addEventListener('click', connectWallet);
