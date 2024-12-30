/**
 * Utility to shorten a string in the middle.
 * E.g., 'abcdef1234567890' -> 'abcdef...7890'
 *
 * @param {string} str - The string to shorten
 * @param {number} maxLength - The maximum allowed length
 * @param {number} front - How many characters to keep at the start
 * @param {number} back - How many characters to keep at the end
 * @returns {string}
 */
function shortenMid(str, maxLength = 20, front = 6, back = 6) {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  const start = str.slice(0, front);
  const end = str.slice(-back);
  return `${start}...${end}`;
}

/**
 * Creates and appends a generic modal to the document body.
 *
 * @param {Object} options - Configuration for the modal
 * @param {string} [options.title] - The modal title
 * @param {string} [options.body] - The inner HTML for the modal body
 * @param {boolean} [options.showSpinner=false] - Whether to display a spinner at the top
 * @param {string} [options.confirmText] - Text for the "Confirm" button (omit or null to hide)
 * @param {Function} [options.onConfirm] - Handler for the "Confirm" button click
 * @param {string} [options.cancelText] - Text for the "Cancel" button (omit or null to hide)
 * @param {Function} [options.onCancel] - Handler for the "Cancel" button click
 *
 * @returns {HTMLDivElement} - The created modal backdrop element
 */
export function createModal({
  title = '',
  body = '',
  showSpinner = false,
  confirmText = null,
  onConfirm = null,
  cancelText = null,
  onCancel = null,
} = {}) {
  // 1) Create the backdrop
  const modalBackdrop = document.createElement('div');
  modalBackdrop.classList.add('modal-backdrop');

  // 2) Create the modal content container
  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');

  // 3) Optional spinner (using Aleph favicon)
  if (showSpinner) {
    const spinnerContainer = document.createElement('div');
    spinnerContainer.classList.add('spinner-container');
    spinnerContainer.innerHTML = `
      <img
        src="https://aleph.im/aleph/favicon-32x32.png"
        alt="Aleph Spinner"
        class="spinner-img"
      />
    `;
    modalContent.appendChild(spinnerContainer);
  }

  // 4) Title (optional) -- shorten if too long
  if (title) {
    const heading = document.createElement('h2');
    heading.textContent = shortenMid(title, 40, 8, 8);
    modalContent.appendChild(heading);
  }

  // 5) Body HTML
  // If "body" might contain HTML and you only want to shorten *text*,
  // you might prefer to do the trimming before passing it in, or carefully parse.
  if (body) {
    const bodyDiv = document.createElement('div');
    
    // Check for an instance ID pattern and shorten it
    const instanceIdMatch = body.match(/([a-f0-9]{64})/);
    
    if (instanceIdMatch) {
      const shortenedId = shortenMid(instanceIdMatch[1], 40, 12, 12);  // Keep more of the start/end for clarity
      bodyDiv.innerHTML = body.replace(instanceIdMatch[1], shortenedId);
    } else {
      bodyDiv.innerHTML = shortenMid(body, 200, 50, 50);  // Generic body shortening if no ID found
    }
    
    modalContent.appendChild(bodyDiv);
  }

  // 6) Button container (only if confirm/cancel are provided)
  if (confirmText || cancelText) {
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');

    if (cancelText) {
      const cancelButton = document.createElement('button');
      cancelButton.textContent = shortenMid(cancelText, 16, 6, 6);
      cancelButton.classList.add('cancel-button');
      cancelButton.addEventListener('click', () => {
        if (onCancel) onCancel();
        removeModal(modalBackdrop);
      });
      buttonContainer.appendChild(cancelButton);
    }

    if (confirmText) {
      const confirmButton = document.createElement('button');
      confirmButton.textContent = shortenMid(confirmText, 16, 6, 6);
      confirmButton.classList.add('confirm-button');
      confirmButton.addEventListener('click', () => {
        if (onConfirm) onConfirm();
        removeModal(modalBackdrop);
      });
      buttonContainer.appendChild(confirmButton);
    }

    modalContent.appendChild(buttonContainer);
  }

  // 7) Append modalContent into the backdrop, then to the body
  modalBackdrop.appendChild(modalContent);
  document.body.appendChild(modalBackdrop);

  // Return the entire backdrop so we can remove it or query it
  return modalBackdrop;
}
/**
 * Removes the given modal element from the DOM.
 * @param {HTMLDivElement} modalElement - The backdrop element returned by createModal()
 */
export function removeModal(modalElement) {
  if (modalElement && modalElement.parentNode) {
    modalElement.parentNode.removeChild(modalElement);
  }
}
