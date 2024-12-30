import Chart from 'chart.js/auto';
import { VM_TIERS } from '../resources/data';

let powerDialChart = null; // Declare the powerDialChart variable
let availableComputeChart = null; // Declare the availableComputeChart variable

export function showPlaceholderCharts() {
    const powerDialCtx = document.getElementById('powerDial').getContext('2d');
    const computeChartCtx = document.getElementById('availableComputeChart').getContext('2d');

    if (!powerDialCtx || !computeChartCtx) {
        console.error("Chart elements not found in the DOM.");
        return;
    }

    // Placeholder data
    const placeholderData = [50, 50];
    const labels = ['Loading...', ''];

    // Power Dial Placeholder
    powerDialChart = new Chart(powerDialCtx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: placeholderData,
                backgroundColor: ['#e0e0e0', '#f5f5f5'],
            }],
        },
        options: {
            plugins: { legend: { display: false } },
        },
    });

    // Available Compute Chart Placeholder
    availableComputeChart = new Chart(computeChartCtx, {
        type: 'bar',
        data: {
            labels: ['Loading...'],
            datasets: [{
                label: 'Loading',
                data: [0],
                backgroundColor: '#e0e0e0',
            }],
        },
        options: {
            plugins: { legend: { display: false } },
        },
    });
}

/**
 * Updates the Power Dial and Available Compute charts with new data.
 * @param {number} totalCores - The total number of cores across all instances.
 * @param {number} totalMemory - The total memory across all instances in GB.
 * @param {number} totalCost - The total cost of running instances in ALEPH.
 * @param {number} balance - The wallet balance in ALEPH.
 */
export function updateCharts(totalCores, totalMemory, totalCost, balance) {
    console.log("Updating charts with:", { totalCores, totalMemory, totalCost, balance });

    // Ensure the chart contexts exist
    const powerDialCtx = document.getElementById('powerDial')?.getContext('2d');
    const computeChartCtx = document.getElementById('availableComputeChart')?.getContext('2d');

    if (!powerDialCtx || !computeChartCtx) {
        console.error("Chart elements are missing in the DOM.");
        return;
    }

    // Update Power Dial Chart
    updatePowerDial(balance);

    // Update Available Compute Chart
    updateAvailableComputeChart(totalCores, balance);

    // Update Resource Usage display
    document.getElementById('totalCpu').textContent = `${totalCores} vCPUs`;
    document.getElementById('totalMemory').textContent = `${(totalMemory / 1024).toFixed(2)} GB`;
}

export function resetCharts() {
    if (powerDialChart) {
        powerDialChart.destroy();
        powerDialChart = null;
    }
    if (availableComputeChart) {
        availableComputeChart.destroy();
        availableComputeChart = null;
    }
}

/**
 * Calculate the cost for a node based on resources.
 * @param {Object} resources - The resources of the node (vCPUs, memory, etc.).
 * @returns {number} - The calculated cost in ALEPH.
 */
export function calculateNodeCost(resources) {
    const tier = VM_TIERS.find(
        (t) => t.cores === resources.vcpus && t.ram === resources.memory / 1024
    );
    return tier ? tier.cost : 0; // Return 0 if no matching tier is found
}

/**
 * Aggregate total cost, cores, and memory for a list of valid instances.
 * @param {Array} instances - The list of valid instances.
 * @returns {Object} - Aggregated totals.
 */
export function aggregateResources(instances) {
    let totalCores = 0;
    let totalMemory = 0;
    let totalCost = 0;

    instances.forEach(({ resources }) => {
        if (resources && typeof resources.vcpus !== 'undefined' && typeof resources.memory !== 'undefined') {
            totalCores += resources.vcpus || 0;
            totalMemory += resources.memory || 0;
            totalCost += calculateNodeCost(resources);
        } else {
            console.warn("Invalid instance resources:", resources);
        }
    });

    return { totalCores, totalMemory, totalCost };
}


export function calculateUptime(createdTime) {
    const now = new Date();
    const diffMs = now - createdTime;

    const seconds = Math.floor((diffMs / 1000) % 60);
    const minutes = Math.floor((diffMs / 1000 / 60) % 60);
    const hours = Math.floor((diffMs / 1000 / 60 / 60) % 24);
    const days = Math.floor(diffMs / 1000 / 60 / 60 / 24);

    let uptime = '';
    if (days > 0) uptime += `${days}d `;
    if (hours > 0 || days > 0) uptime += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) uptime += `${minutes}m `;
    uptime += `${seconds}s`;

    return uptime;
}

export function updatePowerDial(balance) {
    const powerPercentage = Math.min((balance / 200000) * 100, 100); // Max 100%
    const ctx = document.getElementById('powerDial').getContext('2d');
    
    // Destroy existing chart instance if it exists
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
export function calculateAvailableCompute(balance) {
    const availableCompute = VM_TIERS.map((tier) => ({
        ...tier,
        available: Math.floor(balance / tier.cost), // Calculate how many of each VM can be purchased
    }));

    return availableCompute;
}

// Update Available Compute Chart
export function updateAvailableComputeChart(runningVMs, balance) {
    const compute = calculateAvailableCompute(balance);
    const ctx = document.getElementById('availableComputeChart').getContext('2d');

    // Destroy existing chart instance if it exists
    if (availableComputeChart) {
        availableComputeChart.destroy();
    }

    // Define bar colors dynamically
    const runningColors = compute.map((tier) =>
        tier.cores <= runningVMs ? '#2196f3' : '#b0bec5' // Blue for valid, Grey for invalid
    );
    const availableColors = compute.map((tier) =>
        tier.available > 0 && tier.available >= runningVMs ? '#ff9800' : '#b0bec5' // Orange for valid, Grey for insufficient
    );

    availableComputeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: compute.map((tier) => `${tier.cores} cores / ${tier.ram}GB RAM`),
            datasets: [
                {
                    label: 'Running VMs',
                    data: compute.map((tier) => runningVMs),
                    backgroundColor: runningColors,
                    borderRadius: 4,
                },
                {
                    label: 'Available VMs',
                    data: compute.map((tier) => tier.available),
                    backgroundColor: availableColors,
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
