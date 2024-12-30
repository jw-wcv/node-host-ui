// ui.js

// Show wallet overlay
export function showWalletOverlay() {
  const walletOverlay = document.getElementById('walletOverlay');
  if (walletOverlay) {
      walletOverlay.style.display = 'flex'; // Show the overlay
      walletOverlay.classList.add('visible');
  } else {
      console.error('Wallet overlay element not found!');
  }
}


// Hide wallet overlay
export function hideWalletOverlay() {
  const walletOverlay = document.getElementById('walletOverlay');
  if (walletOverlay) {
      walletOverlay.style.display = 'none'; // Hide the overlay
      walletOverlay.classList.remove('visible'); // Ensure 'visible' class is removed
  } else {
      console.error('Wallet overlay element not found!');
  }
}


// Exporting the nodeGrid constant
export const nodeGrid = document.getElementById('nodeGrid');

if (!nodeGrid) {
  console.error("Error: 'nodeGrid' element is not found in the DOM.");
}

/**
 * Clears all child elements inside the nodeGrid container.
 */
export function clearNodeGrid() {
  if (nodeGrid) {
    nodeGrid.innerHTML = '';
  }
}

/**
 * Displays temporary loading cards with spinners inside the nodeGrid container.
 * This is used while the actual request to fetch nodes is in progress.
 * @param {number} count - Number of spinner cards to display.
 */
export function showLoadingSpinner(count = 3) {
  if (!nodeGrid) return;

  clearNodeGrid(); // Clear existing content

  for (let i = 0; i < count; i++) {
    const spinnerCard = document.createElement('div');
    spinnerCard.className = 'spinner-card';

    spinnerCard.innerHTML = `
      <div class="spinner">
        <div class="double-bounce1"></div>
        <div class="double-bounce2"></div>
      </div>
      <p>Loading...</p>
    `;

    nodeGrid.appendChild(spinnerCard);
  }
}

/**
 * Renders a node in the grid UI.
 * @param {Object} node - The node data to render.
 */
export function renderNode(node) {
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

  // Determine status color class
  const statusClass = getStatusClass(node.status);

  // We'll store the raw IP in the dataset and display the arrow separately
  const rawIpv6 = node.ipv6 && node.ipv6.toLowerCase() !== 'unavailable' ? node.ipv6 : 'Unavailable';
  let ipv6LinkHtml = '';
  if (rawIpv6 !== 'Unavailable') {
    const ipv6Url = `http://[${rawIpv6}]:8080/`;
    ipv6LinkHtml = `
      <a href="${ipv6Url}" target="_blank" rel="noopener" class="ipv6-link-icon">
        ↗
      </a>
    `;
  }

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('data-id', node.id);

  // **Store the raw IPv6** in a data attribute instead of mixing it with the arrow
  card.dataset.ipv6 = rawIpv6;

  // For display, we show the IPv6 text plus arrow link (if available).
  // But we won't rely on .textContent for this anymore in pingNode/configureNode.
  card.innerHTML = `
    <div class="card-status-indicator ${statusClass}"></div>

    <h3 class="node-id">${node.name || node.id}</h3>

    <p>
      <strong>IPv6:</strong>
      <span class="ipv6-display">${rawIpv6}</span>
      ${ipv6LinkHtml}
    </p>

    <p><strong>Status:</strong> ${node.status}</p>
    <p><strong>Uptime:</strong> ${node.uptime}</p>
    <div class="card-actions">
      <button class="delete-button">Delete</button>
      <button class="ping-button">Ping</button>
      <button class="configure-button">Configure</button>
    </div>
    <p class="ping-result" style="display: none;"></p>
  `;

  nodeGrid.appendChild(card);
  console.log(`Node card appended to grid: ${node.id}`);
}


export function renderNodes(nodes) {
  console.log("Rendering nodes:", nodes);
  nodes.forEach((node) => renderNode(node));
}

/**
* Returns a CSS class name for the status circle color
* 'Running' -> green, 'Pending' -> yellow, else -> red
*/
export function getStatusClass(status) {
  if (!status) return 'status-offline'; // default to red if unknown

  const normalized = status.toLowerCase().trim();
  if (normalized === 'running') return 'status-running';
  if (normalized === 'pending') return 'status-pending';

  // If not "running" or "pending", assume offline/error
  return 'status-offline';
}
