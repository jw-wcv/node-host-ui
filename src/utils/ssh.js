import { alephClient } from './auth';
import { alephChannel, alephNodeUrl, alephImage } from '../resources/constants.js';

export async function createSSHKey() {
    try {
        if (!window.ethereum) {
            throw new Error("MetaMask not found. Please install it.");
        }

        // Request wallet connection and retrieve account
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = await getAccountFromProvider(window.ethereum);

        const connectedAccount = await getAccountFromProvider(window.ethereum);
        console.log("Connected Account:", connectedAccount);

        // Initialize Aleph client
        const alephClient = new AuthenticatedAlephHttpClient(connectedAccount);

        // Generate RSA key pair
        let keyPair = forge.pki.rsa.generateKeyPair({ bits: 4096 });
        let privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
        let publicKeyOpenSSH = forge.ssh.publicKeyToOpenSSH(keyPair.publicKey, "ALEPH_SERVICES");

        // Prompt user for a label for the key
        const label = prompt("Enter a label for your SSH key:", "AlephHostingSSH");
        if (!label) {
            alert("Label is required to create an SSH key.");
            return;
        }

        // Post the public key to Aleph
        const message = await alephClient.createPost({
            content: {
                type: "ALEPH-SSH",
                content: {
                    key: publicKeyOpenSSH,
                    label: label,
                },
            },
            postType: "POST",
            channel: alephChannel,
        });

        console.log("SSH Key Posted:", message);

        // Allow user to download the private key
        let blob = new Blob([privateKeyPem], { type: "text/plain" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = `${label}_private_key.pem`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke the object URL to release memory
        URL.revokeObjectURL(url);

        // Clear private key details from memory
        URL.revokeObjectURL(url); // Revoke the object URL
        blob = null; // Clear the Blob object
        privateKeyPem = null; // Clear the private key PEM variable
        keyPair.privateKey = null; // Explicitly nullify the private key in the keyPair object
        keyPair.publicKey = null; // Clear the public key (optional)
        keyPair = null; // Nullify the entire keyPair object

        alert("SSH Key created, saved successfully, and securely deleted from memory!");
    } catch (error) {
        console.error("Error creating SSH Key:", error.message, error.stack);
        alert("An error occurred while creating the SSH key. Please try again.");
    }
}

export async function getSSHKeys() {
    try {
        if (!window.ethereum) {
            throw new Error("MetaMask not found. Please install it.");
        }

        // Request wallet connection and retrieve account
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = await getAccountFromProvider(window.ethereum);

        // Initialize Aleph client
        alephClient = new AuthenticatedAlephHttpClient(account);

        // Fetch POST messages of type ALEPH-SSH
        const response = await alephClient.getMessages({
            types: ['POST'],
            addresses: [account.address],
        });

        const sshKeys = response.messages
            .filter(
                (msg) =>
                    msg.content.type === 'POST' &&
                    msg.content.content.type === 'ALEPH-SSH')
            .map((msg) => ({
                key: msg.content.content.content.key,
                label: msg.content.content.content.label || 'Unnamed Key',
                time: msg.time,
            }));

        console.log("Retrieved SSH Keys:", sshKeys);
        return sshKeys;
    } catch (error) {
        console.error("Error retrieving SSH keys:", error.message, error.stack);
        alert("An error occurred while retrieving SSH keys. Please try again.");
        return [];
    }
}

export function selectSSHKey(sshKeys, onSelect) {
    // Ensure sshKeys have valid content
    if (!Array.isArray(sshKeys) || sshKeys.some((key) => !key?.key)) {
        alert("SSH key data is invalid. Please try again.");
        return;
    }

    const modal = document.createElement("div");
    modal.classList.add("modal-backdrop");

    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    const title = document.createElement("h2");
    title.textContent = "Select an SSH Key";
    modalContent.appendChild(title);

    const form = document.createElement("form");
    sshKeys.forEach((key, index) => {
        const optionContainer = document.createElement("div");
        optionContainer.classList.add("radio-option");

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "sshKey";
        radio.value = index;
        radio.id = `sshKey-${index}`;
        if (index === 0) radio.checked = true;

        const label = document.createElement("label");
        label.htmlFor = `sshKey-${index}`;
        label.textContent = `${key.label} (Created: ${new Date(key.time * 1000).toLocaleString()})`;

        optionContainer.appendChild(radio);
        optionContainer.appendChild(label);
        form.appendChild(optionContainer);
    });

    modalContent.appendChild(form);

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container");

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.classList.add("cancel-button");
    cancelButton.addEventListener("click", () => {
        console.log("Cancel clicked. Removing modal.");
        document.body.removeChild(modal);
    });

    const confirmButton = document.createElement("button");
    confirmButton.textContent = "Confirm";
    confirmButton.classList.add("confirm-button");
    confirmButton.addEventListener("click", (event) => {
        event.preventDefault(); // Prevent form submission and page reload
        const selectedKeyIndex = parseInt(form.sshKey.value, 10);
        if (isNaN(selectedKeyIndex)) {
            alert("Please select a key.");
            return;
        }
        const selectedKey = sshKeys[selectedKeyIndex];
        if (!selectedKey?.key) {
            alert("Selected SSH key is invalid. Please try again.");
            return;
        }

        console.log("Confirm clicked. Selected key:", selectedKey);

        // Remove the modal and call the callback
        document.body.removeChild(modal);
        console.log("Modal removed from DOM.");

        onSelect(selectedKey); // Pass the selected key to the callback
    });

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    modalContent.appendChild(buttonContainer);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    console.log("Modal added to DOM.");
}