function log(message, type = 'info') {
    const consoleLog = document.getElementById('console-log');
    const p = document.createElement('p');
    p.textContent = message; // Clean log messages
    if (type === 'error') {
        p.style.color = '#ff4d4d'; // Bright Red for Dark Mode
    }
    if (type === 'success') {
        p.style.color = '#00e676'; // Bright Green for Dark Mode
    }
    consoleLog.appendChild(p);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Global System Monitor
document.addEventListener('DOMContentLoaded', () => {
    monitorSystemStats();
    initSidebar();
});


function initSidebar() {
    const toggleBtn = document.getElementById('nav-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const navItems = document.querySelectorAll('.nav-item');

    // Toggle Menu
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate close
        sidebar.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            navItems.forEach(n => n.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Switch View
            const viewName = item.dataset.view;
            switchView(viewName);

            // Close sidebar
            sidebar.classList.remove('open');
        });
    });
}

function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none'; // Ensure hidden
    });

    // Show target view
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.style.display = 'flex'; // Or block/flex based on CSS
        // Small timeout to allow display:flex to apply before adding class for animation
        setTimeout(() => target.classList.add('active'), 10);
    }
}

async function monitorSystemStats() {
    setInterval(async () => {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) return;

            const data = await response.json();

            // Check Camera Status
            const statusEl = document.getElementById('system-status');

            if (data.active_camera && data.active_camera.length > 0) {
                // CAMERA ALERT
                statusEl.innerText = `CAMERA ACTIVE: ${data.active_camera.join(', ')}`;
                statusEl.classList.add('danger');
                statusEl.classList.add('blink-alert'); // New flash effect

                // Also log it if not recently logged meant to avoid spam? 
                // For now just redundant log is fine or check last log.
                // log(`[PRIVACY ALERT] Camera accessed by: ${data.active_camera.join(', ')}`, 'error');
            } else {
                // Only reset if not scanning and not showing threats
                // We need to manage priority of status text. 
                // Priority: 1. Camera Alert (Highest) 2. Scanning 3. Idle of Threats/Secure

                const scanBtn = document.getElementById('scan-btn');
                const isScanning = scanBtn.disabled; // Rough check

                if (!isScanning && !statusEl.innerText.includes("THREAT")) {
                    statusEl.innerText = "SYSTEM SECURE";
                    statusEl.classList.remove('danger');
                    statusEl.classList.remove('blink-alert');
                }
            }

        } catch (e) {
            console.error("Monitor error", e);
        }
    }, 2000);
}

// ... (log function and startScan function remain, just ensure startScan doesn't conflict too much)

async function startScan() {
    const btn = document.getElementById('scan-btn');
    const status = document.getElementById('system-status');
    const scannedEl = document.getElementById('stat-scanned');
    const threatsEl = document.getElementById('stat-threats');
    const lastScanEl = document.getElementById('stat-last');

    // Reset UI
    btn.disabled = true;
    btn.innerText = "SCANNING...";
    // status.innerText = "SCAN IN PROGRESS"; // Let the monitor handle general status or override specifically?
    // Let's force it for now, monitor might overwrite if camera turns on (which is good!)

    // Animate Log
    log("INITIALIZING SCAN SEQUENCE...", 'info');

    // ... (rest of scan logic) ...

    try {
        // 1. Kick off the scan
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: null }) // Passing null to trigger default Home Directory scan
        });

        if (response.status === 409) {
            log("SCAN ALREADY IN PROGRESS...", 'error');
            // Optionally jump straight to polling if we wanted to recover a session
            return;
        }

        if (!response.ok) throw new Error("Failed to start scan");
        const startData = await response.json();
        log(`SCAN TARGET: ${startData.path}`, 'info');

        // 2. Start Polling
        // Clear any existing interval just in case
        if (window.scanPollInterval) clearInterval(window.scanPollInterval);

        window.scanPollInterval = setInterval(async () => {
            try {
                const statusRes = await fetch('/api/scan/status');
                if (!statusRes.ok) return;
                const data = await statusRes.json();

                // Update Live Stats
                scannedEl.innerText = data.scanned_count;
                threatsEl.innerText = data.threat_count;

                if (!data.is_scanning) {
                    clearInterval(window.scanPollInterval);
                    finalizeScan(data);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 500);

    } catch (error) {
        log("ERROR CONNECTING TO SCAN PROCESSOR", 'error');
        console.error(error);
        btn.disabled = false;
        btn.innerText = "INITIATE SCAN";
    }
}

function finalizeScan(data) {
    const btn = document.getElementById('scan-btn');
    const status = document.getElementById('system-status');
    const lastScanEl = document.getElementById('stat-last');

    lastScanEl.innerText = new Date().toLocaleTimeString();
    log(`SCAN COMPLETE. FILES ANALYZED: ${data.scanned_count}`, 'success');

    if (data.threats.length > 0) {
        status.innerText = "THREAT DETECTED";
        status.classList.add('danger');
        status.style.color = ""; // Start using class styles again if overridden
        status.style.borderColor = "";

        const uniqueThreats = new Set(data.threats.map(t => `${t.threat} in ${t.file}`));
        uniqueThreats.forEach(t => log(`[CRITICAL] DETECTED: ${t}`, 'error'));
    } else {
        status.innerText = "SYSTEM SECURE";
        status.classList.remove('danger');
        status.style.color = "";
        status.style.borderColor = "";

        log("NO THREATS FOUND. SYSTEM IS CLEAN.", 'success');
    }

    btn.disabled = false;
    btn.innerText = "INITIATE SCAN";
}
