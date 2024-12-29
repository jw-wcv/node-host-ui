export async function configureNode(ipv6, nodeId) {
    try {
        const privateKey = await requestPrivateKey();
        if (!privateKey) {
            alert("Private key is required to configure the node.");
            return;
        }

        const gitRepo = prompt("Enter the Git repository URL to clone:");
        if (!gitRepo) {
            alert("Git repository URL is required.");
            return;
        }

        const response = await fetch('/configure-node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ipv6, privateKey, gitRepo }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Error configuring the node:', error);
            alert('Failed to configure the node. Check the console for details.');
            return;
        }

        const result = await response.json();
        console.log('Node configured successfully:', result);
        alert(`Configuration process initiated for node: ${nodeId}. Check the logs.`);
    } catch (error) {
        console.error('Error configuring the node:', error.message);
        alert('An error occurred while configuring the node. Please try again.');
    }
}

export async function pingNode(ipv6, button) {
    if (!ipv6 || ipv6 === 'Unavailable') {
        alert('IPv6 address is unavailable for this node.');
        return;
    }

    const pingResult = button.parentElement.nextElementSibling; // The <p class="ping-result">
    pingResult.style.display = 'block';
    pingResult.innerHTML = '<span class="spinner"></span> Pinging...';

    try {
        const response = await fetch(`http://[${ipv6}]:8080/status`);
        if (!response.ok) {
            throw new Error(`Ping failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            const details = data.details
                .replace(/\n+/g, '\n') // Replace multiple newlines with a single newline
                .trim(); // Trim any leading or trailing whitespace

            const lines = details.split('\n').filter(line => line.trim() !== '');
            let nodeDetails = '';
            let workloadTable = `<table class="workload-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Version</th>
                        <th>Status</th>
                        <th>CPU (cores)</th>
                        <th>Memory (bytes)</th>
                        <th>Age</th>
                        <th>Port(s)</th>
                    </tr>
                </thead>
                <tbody>
            `;

            for (const line of lines) {
                if (line.startsWith('Node ID') || line.includes('Gala Node')) {
                    // Add node details in a separate section
                    nodeDetails += `<p>${line}</p>`;
                } else if (line.startsWith('Name') || line.includes('drng') || line.includes('founders')) {
                    // Format workload status as table rows
                    const columns = line.split(/\s{2,}/).map(col => col.trim());
                    workloadTable += `<tr>${columns.map(col => `<td>${col}</td>`).join('')}</tr>`;
                }
            }

            workloadTable += '</tbody></table>';

            pingResult.innerHTML = `
                <div class="ping-success">
                    <strong>Ping Success:</strong>
                    <div class="node-details">
                        ${nodeDetails}
                    </div>
                    <div class="workload-status">
                        <h4>Workload Status:</h4>
                        ${workloadTable}
                    </div>
                </div>
            `;
        } else {
            pingResult.innerHTML = `<strong>Ping Failed:</strong> ${JSON.stringify(data)}`;
        }
    } catch (error) {
        console.error('Ping error:', error);
        pingResult.innerHTML = `<strong>Ping Failed:</strong> ${error.message}`;
    }
}

async function requestPrivateKey() {
    return new Promise((resolve) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pem'; // Restrict to private key files
        fileInput.style.display = 'none';

        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) {
                alert('No file selected.');
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => {
                alert('Failed to read private key file.');
                resolve(null);
            };
            reader.readAsText(file);
        };

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    });
}
