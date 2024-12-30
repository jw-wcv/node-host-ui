// metrics.js

import Chart from 'chart.js/auto';
import { VM_TIERS } from '../resources/data';

// Keep references to our chart instances
let powerDialChart = null; 
let availableComputeChart = null; 

// SHOW PLACEHOLDER CHARTS
// =======================
export function showPlaceholderCharts() {
    const powerDialCtx = document.getElementById('powerDial')?.getContext('2d');
    const computeChartCtx = document.getElementById('availableComputeChart')?.getContext('2d');

    if (!powerDialCtx || !computeChartCtx) {
        console.error("Chart elements not found in the DOM.");
        return;
    }

    // 1) Destroy old charts if they exist
    if (powerDialChart) {
        powerDialChart.destroy();
        powerDialChart = null;
    }
    if (availableComputeChart) {
        availableComputeChart.destroy();
        availableComputeChart = null;
    }

    // 2) Build placeholder data
    const placeholderData = [50, 50];
    const labels = ['Loading...', ''];

    // 3) Create the Power Dial placeholder
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

    // 4) Create the Available Compute placeholder
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

// RESET CHARTS
// ============
// Safely destroy both chart instances.
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

// UPDATE CHARTS
// =============
/**
 * Updates both the Power Dial and Available Compute charts with new data.
 * @param {number} totalCores - The total number of cores across all instances.
 * @param {number} totalMemory - The total memory across all instances in GB.
 * @param {number} totalCost - The total cost of running instances in ALEPH.
 * @param {number} balance - The wallet balance in ALEPH.
 */
export function updateCharts(totalCores, totalMemory, totalCost, balance) {
    console.log("Updating charts with:", { totalCores, totalMemory, totalCost, balance });

    const powerDialCtx = document.getElementById('powerDial')?.getContext('2d');
    const computeChartCtx = document.getElementById('availableComputeChart')?.getContext('2d');

    if (!powerDialCtx || !computeChartCtx) {
        console.error("Chart elements are missing in the DOM.");
        return;
    }

    // Update (or recreate) the Power Dial
    updatePowerDial(balance);

    // Update (or recreate) the Available Compute
    updateAvailableComputeChart(totalCores, balance);

    // Update the resource usage display in the DOM
    document.getElementById('totalCpu').textContent = `${totalCores} vCPUs`;
    document.getElementById('totalMemory').textContent = `${(totalMemory / 1024).toFixed(2)} GB`;
}

// POWER DIAL
// ==========
export function updatePowerDial(balance) {
    console.log("Updating Power Dial...");
    console.log("Input balance:", balance);

    const powerPercentage = Math.min((balance / 200000) * 100, 100); // Cap at 100%
    console.log("Calculated power percentage:", powerPercentage);

    const ctx = document.getElementById('powerDial')?.getContext('2d');
    if (!ctx) {
        console.error("Power Dial canvas context is missing!");
        return;
    }

    // Destroy existing chart if it exists
    if (powerDialChart) {
        console.log("Destroying existing Power Dial chart instance.");
        powerDialChart.destroy();
    }

    // Recreate the Power Dial chart
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
                padding: 10, 
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

    console.log("Power Dial chart updated successfully.");
}

// AVAILABLE COMPUTE CHART
// =======================
export function updateAvailableComputeChart(runningVMs, balance) {
    console.log("Updating Available Compute Chart...");
    console.log("Running VMs:", runningVMs, "Balance:", balance);

    const compute = calculateAvailableCompute(balance);
    console.log("Calculated available compute data:", compute);

    const ctx = document.getElementById('availableComputeChart')?.getContext('2d');
    if (!ctx) {
        console.error("Available Compute Chart canvas context is missing!");
        return;
    }

    // Destroy existing chart if it exists
    if (availableComputeChart) {
        console.log("Destroying existing Available Compute Chart instance.");
        availableComputeChart.destroy();
    }

    // Dynamically define bar colors based on the user’s balance and running VMs
    const runningColors = compute.map((tier) =>
        tier.cores <= runningVMs ? '#2196f3' : '#b0bec5' // Blue if the tier can run, otherwise grey
    );
    const availableColors = compute.map((tier) =>
        tier.available > 0 && tier.available >= runningVMs ? '#ff9800' : '#b0bec5'
    );

    console.log("Running VM colors:", runningColors);
    console.log("Available VM colors:", availableColors);

    availableComputeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: compute.map((tier) => `${tier.cores} cores / ${tier.ram}GB RAM`),
            datasets: [
                {
                    label: 'Running VMs',
                    data: compute.map(() => runningVMs),
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
                padding: 10,
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
                        stepSize: 1, 
                        font: {
                            size: 12,
                        },
                    },
                },
            },
        },
    });

    console.log("Available Compute Chart updated successfully.");
}

// UTILITY FUNCTIONS
// =================
export function calculateAvailableCompute(balance) {
    return VM_TIERS.map((tier) => ({
        ...tier,
        // how many of this tier could the user theoretically afford?
        available: Math.floor(balance / tier.cost), 
    }));
}

export function calculateNodeCost(resources) {
    const tier = VM_TIERS.find(
        (t) => t.cores === resources.vcpus && t.ram === resources.memory / 1024
    );
    return tier ? tier.cost : 0;
}

export function aggregateResources(instances) {
    let totalCores = 0;
    let totalMemory = 0;
    let totalCost = 0;

    instances.forEach(({ resources }) => {
        if (resources && resources.vcpus !== undefined && resources.memory !== undefined) {
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
