import Chart from 'chart.js/auto';
import { VM_TIERS } from '../resources/data';


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