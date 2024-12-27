// Import dependencies
import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client';
import { ethers } from 'ethers';
import './styles.css';

const walletDisplay = document.getElementById('walletDisplay');
const balanceDisplay = document.getElementById('balanceDisplay');
const connectWalletButton = document.getElementById('connectWalletButton');
const nodeGrid = document.getElementById('nodeGrid');

let alephClient;

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
    alephClient = new AuthenticatedAlephHttpClient({
      account: {
        address,
        sign: async (msg) => await signer.signMessage(msg),
      },
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
    if (!alephClient) {
      console.error("Aleph client not initialized.");
      return;
    }
  
    try {
      console.log("Fetching instances...");
      const response = await alephClient.getMessages({
        types: ['INSTANCE'],
        addresses: [alephClient.account.address],
      });
  
      console.log("Raw response from Aleph:", response);
  
      // Clear the node grid
      nodeGrid.innerHTML = '';
  
      // Check if no instances are returned
      if (!response.messages || response.messages.length === 0) {
        nodeGrid.innerHTML = '<p>No instances found for this wallet.</p>';
        return;
      }
  
      // Iterate over the instances and render them
      for (const message of response.messages) {
        const instanceId = message.item_hash;
        const ipv6 = await fetchInstanceIp(instanceId);
        console.log(`Instance ID: ${instanceId}, IPv6: ${ipv6}`);
  
        renderNode({
          id: instanceId,
          ipv6: ipv6 || 'Unavailable',
          status: message.confirmed ? 'Running' : 'Pending',
          uptime: '0h 0m',
        });
      }
    } catch (error) {
      console.error("Error fetching instances:", error);
      nodeGrid.innerHTML = '<p>Error loading instances. Please try again later.</p>';
    }
  }
  
  

  async function fetchInstanceIp(instanceId) {
    try {
      console.log(`Fetching IPv6 address for instance ID: ${instanceId}`);
      const response = await fetch(`https://scheduler.api.aleph.cloud/api/v0/allocation/${instanceId}`);
  
      if (!response.ok) {
        throw new Error(`Failed to fetch IPv6 for instance ${instanceId}. Status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log(`IPv6 for instance ${instanceId}:`, data.vm_ipv6);
      return data.vm_ipv6 || null;
    } catch (error) {
      console.error(`Error fetching IPv6 for instance ID ${instanceId}:`, error);
      return null;
    }
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

async function createInstance() {
  const sshKey = prompt("Enter SSH Key:");
  if (!sshKey) return;

  try {
    const instance = await alephClient.createInstance({
      authorized_keys: [sshKey],
      resources: { vcpus: 2, memory: 2048, seconds: 3600 },
      payment: { chain: "ETH", type: "hold" },
      channel: alephChannel,
      image: "4a0f62da42f4478544616519e6f5d58adb1096e069b392b151d47c3609492d0c",
      environment: {},
    });

    alert(`Instance ${instance.item_hash} created successfully!`);
    await listInstances();
  } catch (error) {
    console.error("Error creating instance:", error);
  }
}

async function deleteNode(instanceId) {
  try {
    await alephClient.forget({
      hashes: [instanceId],
      reason: "User requested teardown",
      channel: alephChannel,
    });

    alert(`Instance ${instanceId} deleted successfully!`);
    await listInstances();
  } catch (error) {
    console.error("Error deleting instance:", error);
  }
}

function disconnectWallet() {
  walletDisplay.textContent = 'Wallet: Not Connected';
  balanceDisplay.textContent = 'Balance: 0 ALEPH';
  connectWalletButton.textContent = 'Connect Wallet';
  connectWalletButton.onclick = connectWallet;
  nodeGrid.innerHTML = '';
}

connectWalletButton.addEventListener('click', connectWallet);

document.querySelector('.action-button').addEventListener('click', createInstance);
