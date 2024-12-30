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

  // 4) Title (optional)
  if (title) {
    const heading = document.createElement('h2');
    heading.textContent = title;
    modalContent.appendChild(heading);
  }

  // 5) Body HTML
  if (body) {
    const bodyDiv = document.createElement('div');
    bodyDiv.innerHTML = body;
    modalContent.appendChild(bodyDiv);
  }

  // 6) Button container (only if confirm/cancel are provided)
  if (confirmText || cancelText) {
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');

    if (cancelText) {
      const cancelButton = document.createElement('button');
      cancelButton.textContent = cancelText;
      cancelButton.classList.add('cancel-button');
      cancelButton.addEventListener('click', () => {
        if (onCancel) onCancel();
        removeModal(modalBackdrop);
      });
      buttonContainer.appendChild(cancelButton);
    }

    if (confirmText) {
      const confirmButton = document.createElement('button');
      confirmButton.textContent = confirmText;
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

/**
 * Removes the given modal element from the DOM.
 * @param {HTMLDivElement} modalElement - The backdrop element returned by createModal()
 */
export function removeModal(modalElement) {
  if (modalElement && modalElement.parentNode) {
    modalElement.parentNode.removeChild(modalElement);
  }
}
