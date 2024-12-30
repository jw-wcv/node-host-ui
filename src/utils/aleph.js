//aleph.js

import { alephClient, account, ensureAlephClient } from './client.js'; // Centralized client management
import { getSSHKeys, selectSSHKey } from './ssh.js'; // SSH key-related functions
import { calculateUptime, aggregateResources, updatePowerDial, updateAvailableComputeChart, resetCharts, showPlaceholderCharts, updateCharts } from './metrics.js'; // Metrics utilities
import { clearNodeGrid, showLoadingSpinner, nodeGrid  } from './ui.js'; // UI elements and helpers
import { alephChannel, alephNodeUrl, alephImage } from '../resources/constants.js';

let createNodeInProgress = false; // Prevent simultaneous node creation
let isLoadingInstances = false; // Prevent duplicate calls

/**
 * Renders a node in the grid UI.
 * @param {Object} node - The node data to render.
 */
export function renderNode(node) {
  console.log("Rendering node:", node);
  if (!nodeGrid) {
      console.error("Node grid is missing in the DOM.");
      return;
  }

  // Check if the node card already exists
  const existingCard = nodeGrid.querySelector(`.card[data-id="${node.id}"]`);
  if (existingCard) {
      console.log(`Node with ID ${node.id} already exists. Skipping duplicate rendering.`);
      return;
  }

  // Log before creating the card
  console.log("Creating new card for node:", node);

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
  console.log(`Node card appended to grid: ${node.id}`);
}

export function renderNodes(nodes) {
  console.log("Rendering nodes:", nodes);
  nodes.forEach((node) => renderNode(node));
}

/**
 * Filters valid Aleph instances by removing those that have a matching FORGET message.
 * @param {Array} messages - The raw messages from Aleph.
 * @returns {Array} - A list of valid instance messages.
 */
export function filterValidNodes(messages) {
  const instanceMessages = messages.filter((msg) => msg.type === 'INSTANCE');
  const forgetHashes = new Set(
      messages
          .filter((msg) => msg.type === 'FORGET')
          .flatMap((msg) => msg.content.hashes || [])
  );

  return instanceMessages.filter((msg) => !forgetHashes.has(msg.item_hash));
}

/**
 * Lists Aleph instances linked to the connected wallet.
 */
export async function listInstances() {
  if (!alephClient) {
      console.error("Aleph client not initialized.");
      return;
  }

  if (isLoadingInstances) return;
    isLoadingInstances = true;

  try {
      const walletAddress = account.address;
      if (!walletAddress) {
          console.warn("Wallet address is undefined.");
          return;
      }

      // Show placeholders and spinners while data loads
      showLoadingSpinner(3); // Show temporary loading cards
      showPlaceholderCharts(); // Show placeholder charts

      // Fetch INSTANCE and FORGET messages
      const response = await alephClient.getMessages({
          types: ['INSTANCE', 'FORGET'],
          addresses: [walletAddress],
      });

      if (!response.messages || response.messages.length === 0) {
          clearNodeGrid();
          resetCharts();
          nodeGrid.innerHTML = '<p>No instances found for this wallet.</p>';
          return;
      }

      // Filter valid instances using `filterValidNodes`
      const validInstances = filterValidNodes(response.messages);

      if (validInstances.length === 0) {
          clearNodeGrid();
          resetCharts();
          nodeGrid.innerHTML = '<p>No active instances found for this wallet.</p>';
          return;
      }

      // Aggregate resources and costs
      const { totalCores, totalMemory, totalCost } = aggregateResources(
          validInstances.map((msg) => msg.content || {})
      );

      console.log("Valid instances:", validInstances);
      console.log("Instance resources:", validInstances.map((msg) => msg.content.resources));


      // Prepare nodes for rendering
      /*
      const nodes = await Promise.all(
        validInstances.map(async (message) => {
            const { metadata, resources, time } = message.content || {};
            const instanceId = message.item_hash;
  
            // Log the instance ID and resources
            console.log("Preparing node:", { instanceId, resources });
            
            // Await the IPv6 resolution
            const ipv6 = await fetchInstanceIp(instanceId);
            const createdTime = new Date(time * 1000); // Convert UNIX time to Date
            const uptime = calculateUptime(createdTime);
  
            return {
                id: instanceId,
                name: metadata?.name || 'Unnamed',
                ipv6: ipv6 || 'Unavailable',
                status: message.confirmed ? 'Running' : 'Pending',
                uptime,
            };
          })
        );

         // Log resolved nodes
        console.log("Resolved nodes:", nodes);
        renderNodes(nodes);
        */

        // Clear placeholders after fetching data
        clearNodeGrid();
        resetCharts();

        // Render valid instances
        for (const message of validInstances) {
          const { metadata, resources, time } = message.content || {};
          const instanceId = message.item_hash;
          const ipv6 = await fetchInstanceIp(instanceId);
          const createdTime = new Date(time * 1000); // Convert UNIX time to Date
          const uptime = calculateUptime(createdTime);

           // Log the instance ID and resources
           console.log("Preparing node:", { instanceId, resources });

          renderNode({
              id: instanceId,
              name: metadata?.name || null,
              ipv6: ipv6 || 'Unavailable',
              status: message.confirmed ? 'Running' : 'Pending',
              uptime: uptime,
          });
      }

        
        // Update Resource Usage and Billing Information
        document.getElementById('totalCpu').textContent = `${totalCores} vCPUs`;
        document.getElementById('totalMemory').textContent = `${(totalMemory / 1024).toFixed(2)} GB`;
        document.getElementById('currentMonth').textContent = `${(totalCost / 1000).toFixed(2)} K ALEPH`;
        document.getElementById('totalUsage').textContent = `${(totalCost / 1000).toFixed(2)} K ALEPH`;

        // Update charts
        const balanceMatch = balanceDisplay.textContent.match(/Balance:\s([\d.]+)/);
        const balance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;
        updatePowerDial(balance);
        updateAvailableComputeChart(totalCores, balance);

  } catch (error) {
      console.error("Error fetching instances:", error.message);
      nodeGrid.innerHTML = '<p>Error loading instances. Please refresh or try again later.</p>';
  } finally {
      // Ensure charts and spinners are cleared in case of errors
      isLoadingInstances = false;
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
        console.log(`Fetched IPv6 for ${instanceId}:`, data.vm_ipv6);
        return data.vm_ipv6 || 'Unavailable';
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
    await ensureAlephClient(); // Ensure alephClient is ready
      if (!alephClient) {
          throw new Error("Aleph client is not initialized. Please connect your wallet first.");
      }

      console.log('Creating Instance');

      const sshKeys = await getSSHKeys();
      if (sshKeys.length === 0) {
          alert("No SSH keys available. Please create one first.");
          return;
      }

      selectSSHKey(sshKeys, async (selectedKey) => {
          const label = prompt("Enter a label for your VM:", "AlephVM").trim();
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
