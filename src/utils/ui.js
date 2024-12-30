// ui.js

// Show wallet overlay
export function showWalletOverlay() {
  const overlay = document.getElementById('walletOverlay');
  overlay.classList.add('visible');
  document.body.classList.add('overlay-active'); // Lock the UI
}

// Hide wallet overlay
export function hideWalletOverlay() {
  const overlay = document.getElementById('walletOverlay');
  overlay.classList.remove('visible');
  document.body.classList.remove('overlay-active');
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
