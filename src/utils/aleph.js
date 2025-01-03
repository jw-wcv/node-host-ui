//aleph.js

import { account, getOrInitializeAlephClient } from './client.js'; // Centralized client management
import { getSSHKeys, selectSSHKey } from './ssh.js'; // SSH key-related functions
import { calculateUptime, aggregateResources, updatePowerDial, updateAvailableComputeChart, resetCharts, showPlaceholderCharts, updateCharts } from './metrics.js'; // Metrics utilities
import { clearNodeGrid, showLoadingSpinner, nodeGrid  } from './ui.js'; // UI elements and helpers
import { alephChannel, alephNodeUrl, alephImage } from '../resources/constants.js';
import { createModal, removeModal } from '../components/modal.js';
import { getStatusClass, renderNode, renderNodes } from './ui.js';

let createNodeInProgress = false; // Prevent simultaneous node creation
let isLoadingInstances = false; // Prevent duplicate calls

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
  const client = await getOrInitializeAlephClient(); // Ensure client is initialized  

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
      const response = await client.getMessages({
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

        // Clear placeholders after fetching data
        clearNodeGrid();
        resetCharts();

         // Log resolved nodes
        console.log("Resolved nodes:", nodes);
        renderNodes(nodes);

        // Render valid instances
        /*
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
          */

        
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
    if (createNodeInProgress) {
        console.warn("Instance creation is already in progress.");
        return;
    }
    createNodeInProgress = true;

    // 1) Show a spinner while we fetch SSH keys
    const spinnerModal = createModal({
        title: 'Checking SSH Keys',
        body: '<p>Retrieving available SSH keys. Please wait...</p>',
        showSpinner: true
    });

    try {
        // Ensure client is initialized
        const client = await getOrInitializeAlephClient();
        console.log('Creating Instance');

        // Fetch SSH keys
        const sshKeys = await getSSHKeys();
        if (sshKeys.length === 0) {
            removeModal(spinnerModal); // Hide spinner
            alert("No SSH keys available. Please create one first.");
            return;
        }

        // 2) Done fetching => remove spinner
        removeModal(spinnerModal);

        // 3) Let the user choose which SSH key to use
        selectSSHKey(sshKeys, async (selectedKey) => {
            // As soon as they pick a key, show another spinner for instance creation
            const creationModal = createModal({
                title: 'Creating Instance',
                body: '<p>Spinning up a new VM. This may take a few seconds...</p>',
                showSpinner: true
            });

            try {
                const label = prompt("Enter a label for your VM:", "AlephVM")?.trim();
                if (!label) {
                    removeModal(creationModal);
                    alert("Label is required to create a VM.");
                    return;
                }

                const instance = await client.createInstance({
                    authorized_keys: [selectedKey.key],
                    resources: { vcpus: 1, memory: 2048, seconds: 3600 },
                    payment: { chain: "ETH", type: "hold" },
                    channel: alephChannel,
                    metadata: { name: label },
                    image: alephImage,
                });

                alert(`Instance ${instance.item_hash} created successfully!`);
                await listInstances();
            } catch (error) {
                console.error("Error creating instance:", error.message);
                alert("Failed to create instance.");
            } finally {
                removeModal(creationModal); // Hide spinner when done
            }
        });

    } catch (error) {
        console.error("Error creating instance:", error.message);
        alert("Failed to create instance.");
    } finally {
        // In all cases, let other calls proceed eventually
        createNodeInProgress = false;
    }
}


/**
 * Deletes a specified Aleph instance.
 * @param {string} instanceId - The ID of the instance to delete.
 */
export async function deleteNode(instanceId) {
    const client = await getOrInitializeAlephClient(); // Ensure client is initialized

    // Optionally disable the corresponding delete button (if it exists)
    const deleteButton = document.querySelector(`#delete-button-${instanceId}`);
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.innerHTML = `<span class="spinner"></span> Deleting...`;
    }

    try {
        // 1) Show a "Confirm Delete" modal rather than using window.confirm
        const confirmModal = createModal({
            title: 'Confirm Deletion',
            body: `<p>Are you sure you want to delete instance <strong>${instanceId}</strong>?</p>`,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                // 2) Once user clicks "Yes, Delete", show a spinner modal
                const spinnerModal = createModal({
                    title: 'Deleting Instance',
                    body: `<p>Please wait while we delete instance <strong>${instanceId}</strong>...</p>`,
                    showSpinner: true,
                });

                try {
                    await client.forget({
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
                    removeModal(spinnerModal); // Hide spinner
                }
            },
            onCancel: () => {
                // If user cancels, just do nothing
                console.log(`User canceled deletion of instance ${instanceId}`);
            }
        });

        // confirmModal is returned in case you want to manipulate it,
        // but we don't actually need to store it. The user either confirms or cancels.

    } catch (error) {
        console.error("Error deleting instance (unexpected):", error.message);
        alert("Failed to delete instance.");
    } finally {
        // Re-enable the button no matter what
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = `Delete`;
        }
    }
}


/**
 * Creates a new Aleph post.
 * @param {Object} content - The content of the post.
 * @param {string} postType - The type of the post.
 * @param {string} channel - The channel to post to.
 */
export async function createPost(content, postType = "AI-C", channel = "AI") {
    try {
        const client = await getOrInitializeAlephClient(); // Ensure client is initialized
        const message = await client.createPost({
            content,
            postType,
            channel,
        });
        console.log("Post created:", message);
        return message;
    } catch (error) {
        console.error("Error creating post:", error.message);
        throw new Error("Failed to create post.");
    }
}

/**
 * Updates (amends) an existing Aleph post.
 * @param {Object} content - The updated content of the post.
 * @param {string} refHash - The hash of the post to amend.
 * @param {string} channel - The channel of the post.
 */
export async function updatePost(content, refHash, channel = "AI") {
    try {
        const client = await getOrInitializeAlephClient(); // Ensure client is initialized
        const message = await client.createPost({
            content,
            postType: "amend",
            ref: refHash,
            channel,
        });
        console.log("Post updated:", message);
        return message;
    } catch (error) {
        console.error("Error updating post:", error.message);
        throw new Error("Failed to update post.");
    }
}

/**
 * Deletes a specified Aleph post.
 * @param {string[]} hashes - Array of post hashes to delete.
 * @param {string} reason - Reason for deleting the post.
 * @param {string} channel - The channel of the post.
 */
export async function deletePost(hashes, reason = "No longer needed", channel = "AI") {
    try {
        const client = await getOrInitializeAlephClient(); // Ensure client is initialized
        const message = await client.forget({
            hashes,
            reason,
            channel,
        });
        console.log("Post deleted:", message);
        return message;
    } catch (error) {
        console.error("Error deleting post:", error.message);
        throw new Error("Failed to delete post.");
    }
}