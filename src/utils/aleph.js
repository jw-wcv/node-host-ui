import { alephClient, initializeAlephClient } from './client.js'; // Centralized client management
import { getSSHKeys, selectSSHKey } from './ssh.js'; // SSH key-related functions
import { calculateUptime, updatePowerDial, updateAvailableComputeChart } from './metrics.js'; // Metrics utilities
import { clearNodeGrid, showLoadingSpinner, nodeGrid  } from './ui.js'; // UI elements and helpers
import { alephChannel, alephNodeUrl, alephImage } from '../resources/constants.js';

let createNodeInProgress = false; // Prevent simultaneous node creation

/**
 * Renders a node in the grid UI.
 * @param {Object} node - The node data to render.
 */
export function renderNode(node) {
    const existingCard = nodeGrid.querySelector(`.card[data-id="${node.id}"]`);
    if (existingCard) {
        console.log(`Node with ID ${node.id} already exists. Skipping duplicate rendering.`);
        return;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', node.id);

    card.innerHTML = `
        <h3 class="node-id">${node.name || node.id}</h3>
        <p><strong>IPv6:</strong> ${node.ipv6}</p>
        <p><strong>Status:</strong> ${node.status}</p>
        <p><strong>Uptime:</strong> ${node.uptime}</p>
        <div class="card-actions">
            <button class="delete-button">Delete</button>
            <button class="ping-button">Ping</button>
            <button class="configure-button">Configure</button>
        </div>
    `;

    // Append to the grid
    nodeGrid.appendChild(card);
}

/**
 * Lists Aleph instances linked to the connected wallet.
 */
export async function listInstances() {
    if (!alephClient) {
      console.error("Aleph client not initialized.");
      return;
    }
  
    if (!nodeGrid) {
      console.error("Error: 'nodeGrid' element is not found in the DOM.");
      return;
    }
  
    try {
      const walletAddress = alephClient.account?.address;
      if (!walletAddress) {
        console.warn("Wallet address is undefined.");
        nodeGrid.innerHTML = '<p>Error: Wallet address is not available.</p>';
        return;
      }
  
      console.log("Fetching instances for wallet:", walletAddress);
  
      showLoadingSpinner(3); // Show temporary loading spinners
  
      // Fetch INSTANCE and FORGET messages
      const response = await alephClient.getMessages({
        types: ['INSTANCE', 'FORGET'],
        addresses: [walletAddress],
      });
  
      clearNodeGrid(); // Clear loading spinners after fetching
  
      console.log("Raw API response:", response.messages);
  
      if (!response.messages || response.messages.length === 0) {
        console.warn("No instances found.");
        nodeGrid.innerHTML = '<p>No instances found for this wallet.</p>';
        return;
      }
  
      const instanceMessages = response.messages.filter((msg) => msg.type === 'INSTANCE');
      const forgetHashes = new Set(
        response.messages
          .filter((msg) => msg.type === 'FORGET')
          .flatMap((msg) => msg.content.hashes || [])
      );
  
      const validInstances = instanceMessages.filter((msg) => !forgetHashes.has(msg.item_hash));
  
      console.log("Valid instances:", validInstances);
  
      if (validInstances.length === 0) {
        console.warn("No valid instances found.");
        nodeGrid.innerHTML = '<p>No active instances found for this wallet.</p>';
        return;
      }
  
      let totalCores = 0;
      let totalMemory = 0;
      let totalCost = 0;
  
      for (const message of validInstances) {
        const { metadata, resources, time } = message.content || {};
        const instanceId = message.item_hash;
        const ipv6 = await fetchInstanceIp(instanceId);
        const createdTime = new Date(time * 1000);
        const uptime = calculateUptime(createdTime);
  
        console.log("Rendering node:", { instanceId, metadata, resources, ipv6 });
  
        if (resources) {
          totalCores += resources.vcpus || 0;
          totalMemory += resources.memory || 0;
          totalCost += resources.vcpus * 1000; // Example cost calculation
        }
  
        renderNode({
          id: instanceId,
          name: metadata?.name || null,
          ipv6: ipv6 || 'Unavailable',
          status: message.confirmed ? 'Running' : 'Pending',
          uptime: uptime,
        });
      }
  
      document.getElementById('totalCpu').textContent = `${totalCores} vCPUs`;
      document.getElementById('totalMemory').textContent = `${(totalMemory / 1024).toFixed(2)} GB`;
  
      // Update metrics and charts
      updatePowerDial(totalCost);
      updateAvailableComputeChart(totalCores, totalCost);
    } catch (error) {
      console.error("Error listing instances:", error.message);
      clearNodeGrid();
      nodeGrid.innerHTML = '<p>Error loading instances. Please refresh or try again later.</p>';
    }
  }


/**
 * Fetches the IPv6 address for a specific Aleph instance.
 * @param {string} instanceId - The ID of the instance.
 * @returns {string|null} IPv6 address or null if not found.
 */
export async function fetchInstanceIp(instanceId) {
    try {
        const response = await fetch(`https://scheduler.api.aleph.cloud/api/v0/allocation/${instanceId}`);
        if (!response.ok) throw new Error(`Failed to fetch IPv6 for instance ${instanceId}`);
        const data = await response.json();
        return data.vm_ipv6 || null;
    } catch (error) {
        console.error("Error fetching IPv6:", error.message);
        return null;
    }
}

/**
 * Creates a new Aleph instance.
 */
export async function createInstance() {
    if (createNodeInProgress) return;
    createNodeInProgress = true;

    try {
        const sshKeys = await getSSHKeys();
        if (sshKeys.length === 0) {
            alert('No SSH keys available. Please create one first.');
            return;
        }

        selectSSHKey(sshKeys, async (selectedKey) => {
            const label = prompt("Enter a label for your VM:", "AlephVM");
            if (!label) {
                alert("Label is required to create a VM.");
                return;
            }

            const instance = await alephClient.createInstance({
                authorized_keys: [selectedKey.key],
                resources: { vcpus: 1, memory: 2048, seconds: 3600 },
                payment: { chain: "ETH", type: "hold" },
                channel: alephChannel,
                metadata: { name: label },
                image: alephImage,
            });

            alert(`Instance ${instance.item_hash} created successfully!`);
            await listInstances();
        });
    } catch (error) {
        console.error("Error creating instance:", error.message);
        alert("Failed to create instance.");
    } finally {
        createNodeInProgress = false;
    }
}

/**
 * Deletes a specified Aleph instance.
 * @param {string} instanceId - The ID of the instance to delete.
 */
export async function deleteNode(instanceId) {
    if (!alephClient) {
        console.error("Aleph client not initialized.");
        return;
    }

    const deleteButton = document.querySelector(`#delete-button-${instanceId}`);
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.innerHTML = `<span class="spinner"></span> Deleting...`;
    }

    try {
        const confirmed = confirm(`Are you sure you want to delete instance ${instanceId}?`);
        if (!confirmed) return;

        await alephClient.forget({
            hashes: [instanceId],
            reason: "User requested deletion",
            channel: alephChannel,
        });

        alert(`Instance ${instanceId} deleted successfully!`);
        await listInstances();
    } catch (error) {
        console.error("Error deleting instance:", error.message);
        alert("Failed to delete instance.");
    } finally {
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = `Delete`;
        }
    }
}
