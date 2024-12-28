// Import dependencies
import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client';
import { ethers } from 'ethers';
import './styles.css';
import Chart from 'chart.js/auto';


const walletDisplay = document.getElementById('walletDisplay');
const balanceDisplay = document.getElementById('balanceDisplay');
const connectWalletButton = document.getElementById('connectWalletButton');
const nodeGrid = document.getElementById('nodeGrid');

let alephClient;
let powerDialChart; 
let availableComputeChart; 

const alephChannel = "ALEPH-CLOUDSOLUTIONS";
const alephNodeUrl = "https://46.255.204.193";

// Pricing tiers for VMs
const VM_TIERS = [
    { cores: 1, ram: 2, cost: 2000 },
    { cores: 2, ram: 4, cost: 4000 },
    { cores: 4, ram: 8, cost: 8000 },
  ];

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
        console.log("Aleph Client Object:", alephClient);

        const walletAddress = alephClient.account.account?.address;
        if (!walletAddress) {
            console.warn("Wallet address is undefined.");
            return;
        }
        console.log("Aleph Client Wallet Address:", walletAddress);

        // Fetch both INSTANCE and FORGET messages
        const response = await alephClient.getMessages({
            types: ['INSTANCE', 'FORGET'],
            addresses: [walletAddress],
        });

        console.log("Raw response from Aleph:", response);

        // Clear the node grid
        nodeGrid.innerHTML = '';

        if (!response.messages || response.messages.length === 0) {
            nodeGrid.innerHTML = '<p>No instances found for this wallet.</p>';
            return;
        }

        // Separate INSTANCE and FORGET messages
        const instanceMessages = response.messages.filter((msg) => msg.type === 'INSTANCE');
        const forgetHashes = new Set(
            response.messages
                .filter((msg) => msg.type === 'FORGET')
                .flatMap((msg) => msg.content.hashes || [])
        );

        console.log("FORGET hashes:", Array.from(forgetHashes));

        // Filter instances to exclude those with a matching FORGET message
        const validInstances = instanceMessages.filter((msg) => !forgetHashes.has(msg.item_hash));

        if (validInstances.length === 0) {
            nodeGrid.innerHTML = '<p>No active instances found for this wallet.</p>';
            return;
        }

        // Calculate total vCPUs and RAM used by active instances
        let totalCores = 0;
        let totalMemory = 0;
        for (const message of validInstances) {
            const resources = message.content?.resources;
            if (resources) {
                totalCores += resources.vcpus || 0;
                totalMemory += resources.memory || 0;
            }
        }

        console.log(`Total Cores: ${totalCores}, Total Memory: ${totalMemory} MB`);

        // Update Resource Usage section
        document.getElementById('totalCpu').textContent = `${totalCores} vCPUs`;
        document.getElementById('totalMemory').textContent = `${(totalMemory / 1024).toFixed(2)} GB`;

        // Render valid instances
        for (const message of validInstances) {
            const instanceId = message.item_hash;
            const ipv6 = await fetchInstanceIp(instanceId);
            console.log(`Instance ID: ${instanceId}, IPv6: ${ipv6 || 'Unavailable'}`);

            renderNode({
                id: instanceId,
                ipv6: ipv6 || 'Unavailable',
                status: message.confirmed ? 'Running' : 'Pending',
                uptime: '0h 0m',
            });
        }

        // Fetch wallet balance and update charts
        const balanceMatch = balanceDisplay.textContent.match(/Balance:\s([\d.]+)/);
        const balance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;
        updatePowerDial(balance);
        updateAvailableComputeChart(totalCores, balance);
    } catch (error) {
        console.error("Error fetching instances:", error.message);
        nodeGrid.innerHTML = '<p>Error loading instances. Please refresh or try again later.</p>';
    }
}




  
  function updatePowerDial(balance) {
    const powerPercentage = Math.min((balance / 200000) * 100, 100); // Max 100%
    const ctx = document.getElementById('powerDial').getContext('2d');
    if (powerDialChart) {
        powerDialChart.destroy();
    }

    powerDialChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active Power', 'Maximum Allowable Power'],
            datasets: [
                {
                    data: [powerPercentage, 100 - powerPercentage],
                    backgroundColor: ['#4caf50', '#cfd8dc'],
                    borderWidth: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: 10, // Adds spacing around the chart
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.raw.toFixed(2)}% Power`,
                    },
                },
            },
        },
    });
    
}


  // Calculate total VMs that can be purchased
  function calculateAvailableCompute(balance) {
    const availableCompute = VM_TIERS.map((tier) => ({
      ...tier,
      available: Math.floor(balance / tier.cost), // Calculate how many of each VM can be purchased
    }));
  
    return availableCompute;
  }
  
  // Update Available Compute Chart
  function updateAvailableComputeChart(runningVMs, balance) {
    const compute = calculateAvailableCompute(balance);
    const ctx = document.getElementById('availableComputeChart').getContext('2d');
    if (availableComputeChart) {
        availableComputeChart.destroy();
    }

    availableComputeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: compute.map((tier) => `${tier.cores} cores / ${tier.ram}GB RAM`),
            datasets: [
                {
                    label: 'Running VMs',
                    data: compute.map((tier) => tier.cores <= runningVMs ? runningVMs : 0),
                    backgroundColor: '#2196f3',
                    borderRadius: 4,
                },
                {
                    label: 'Available VMs',
                    data: compute.map((tier) => tier.available),
                    backgroundColor: '#ff9800',
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: 10, // Adds spacing around the chart
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                    },
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'VM Tier',
                        font: {
                            size: 14,
                            weight: 'bold',
                        },
                    },
                    ticks: {
                        font: {
                            size: 12,
                        },
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'VM Count',
                        font: {
                            size: 14,
                            weight: 'bold',
                        },
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1, // Ensures the y-axis shows integers
                        font: {
                            size: 12,
                        },
                    },
                },
            },
        },
    });
    
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
        <h3 class="node-id">${node.id}</h3>
        <p><strong>IPv6:</strong> ${node.ipv6}</p>
        <p><strong>Status:</strong> ${node.status}</p>
        <p><strong>Uptime:</strong> ${node.uptime}</p>
        <div class="card-actions">
            <button class="delete-button">Delete</button>
            <button class="ping-button">Ping</button>
        </div>
        <p class="ping-result" style="display: none;"></p>
    `;

    // Add event listeners
    const deleteButton = card.querySelector('.delete-button');
    const pingButton = card.querySelector('.ping-button');
    const pingResultElement = card.querySelector('.ping-result');

    deleteButton.addEventListener('click', () => deleteNode(node.id));
    pingButton.addEventListener('click', () => pingNode(node.ipv6, pingButton, pingResultElement));

    nodeGrid.appendChild(card);
}

async function pingNode(ipv6, button) {
    if (!ipv6 || ipv6 === 'Unavailable') {
        alert('IPv6 address is unavailable for this node.');
        return;
    }

    const card = button.closest('.card');
    const pingResult = card.querySelector('.ping-result');
    pingResult.style.display = 'block'; // Ensure visibility
    pingResult.innerHTML = '<span class="spinner"></span> Pinging...';

    try {
        const response = await fetch(`http://[${ipv6}]:8080/status`);
        if (!response.ok) {
            throw new Error(`Ping failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            const details = data.details
                .replace(/\n+/g, '\n')
                .trim();

            const rows = details.split('\n').filter(line => line.trim());
            let tableContent = rows.map(row => {
                const columns = row.split(/\s{2,}/).map(col => `<td>${col}</td>`);
                return `<tr>${columns.join('')}</tr>`;
            }).join('');

            pingResult.innerHTML = `
                <div class="ping-success">
                    <strong>Ping Success:</strong>
                    Node ID: <span>${data.nodeId}</span><br/>
                    Gala Node is running.
                </div>
                <table class="workload-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Version</th>
                            <th>Status</th>
                            <th>CPU</th>
                            <th>Memory</th>
                            <th>Age</th>
                            <th>Port(s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableContent}
                    </tbody>
                </table>
            `;
        } else {
            pingResult.innerHTML = `<strong>Ping Failed:</strong> ${JSON.stringify(data)}`;
        }
    } catch (error) {
        pingResult.innerHTML = `<strong>Error:</strong> ${error.message}`;
    }
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
