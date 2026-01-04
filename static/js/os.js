class VoidOS {
    constructor() {
        this.booted = false;
        this.zIndex = 100;
        this.activeWindows = [];
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.currentDragWindow = null;

        this.init();
    }

    init() {
        // Wait for user interaction at Intro Screen
    }

    enterVoid() {
        const intro = document.getElementById('intro-layer');
        // Fly through effect
        intro.style.transform = 'scale(20)';
        intro.style.opacity = '0';

        setTimeout(() => {
            intro.style.display = 'none';
            document.getElementById('the-gate').style.display = 'flex';
            this.runBootSequence();
        }, 1500); // Increased duration to match css transition
    }


    /* --- ATMOSPHERE (Day/Night & Audio) --- */


    playSound(type) { }

    /* --- BOOT SEQUENCE --- */
    async runBootSequence() {
        const log = document.getElementById('boot-log');
        const progress = document.getElementById('boot-progress');

        // Resume Audio Context on interaction


        // Fetch specific boot text from "Kernel"
        try {
            const response = await fetch('/api/os/boot');
            const data = await response.json();
            const sequence = data.sequence || ["SYSTEM_READY"];

            // Play sequence
            for (let i = 0; i < sequence.length; i++) {
                log.innerText = sequence[i];
                progress.style.width = `${((i + 1) / sequence.length) * 100}%`;

                await this.sleep(800);
            }
        } catch (e) {
            console.error("Kernel connection failed, running offline boot...");
            log.innerText = "OFFLINE_MODE_ACTIVATED...";
            progress.style.width = "100%";
            await this.sleep(1000);
        }

        // Enter Sanctuary
        document.getElementById('the-gate').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('the-gate').style.display = 'none';

            const sanctuary = document.getElementById('the-sanctuary');
            sanctuary.style.display = 'block'; // Fix for re-login (was stuck at display:none)
            // Small delay to ensure transition works if needed, but usually fine here
            requestAnimationFrame(() => {
                sanctuary.style.opacity = '1';
            });

            this.booted = true;
            this.setupDragListeners();
            this.initSystemTray();
        }, 1000);
    }

    initSystemTray() {
        // 1. Clock
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            const clockEl = document.getElementById('tray-clock');
            if (clockEl) {
                // Blink colon effect
                const displayTime = now.getSeconds() % 2 === 0 ? timeString : timeString.replace(':', ' ');
                clockEl.innerText = timeString;
            }
        };
        setInterval(updateClock, 1000);
        updateClock();

        // 2. Battery
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                const updateBattery = () => {
                    const level = Math.floor(battery.level * 100);
                    const charging = battery.charging;
                    const el = document.getElementById('battery-level');
                    const icon = document.querySelector('#tray-battery i');

                    if (el) el.innerText = `${level}%`;
                    if (icon) {
                        icon.className = charging ? "fas fa-bolt" :
                            (level > 80 ? "fas fa-battery-full" :
                                (level > 50 ? "fas fa-battery-three-quarters" :
                                    (level > 20 ? "fas fa-battery-half" : "fas fa-battery-quarter")));
                    }
                };
                battery.addEventListener('levelchange', updateBattery);
                battery.addEventListener('chargingchange', updateBattery);
                updateBattery();
            });
        }

        // 3. Network
        const updateNetwork = () => {
            const icon = document.querySelector('#tray-wifi i');
            if (icon) {
                icon.style.color = navigator.onLine ? "var(--gold-sun)" : "#555";
                icon.parentElement.title = navigator.onLine ? "VOID_NET: Connected" : "VOID_NET: Offline";
            }
        };
        window.addEventListener('online', updateNetwork);
        window.addEventListener('offline', updateNetwork);
        updateNetwork();
    }

    toggleStartMenu() {
        const menu = document.getElementById('start-menu');
        menu.classList.toggle('visible');
    }

    /* --- WINDOW MANAGEMENT --- */
    openApp(appName) {
        // Genie Effect Origin
        let originRect = null;

        // Try to find the icon that launched this
        // 1. Check Taskbar
        const taskIcon = document.getElementById(`task-${appName}`);
        if (taskIcon) originRect = taskIcon.getBoundingClientRect();

        let title = "Application";
        let content = "Loading...";
        let appClass = "";

        const win = document.createElement('div');
        win.className = 'window-frame window-opening';
        win.id = `win-${this.zIndexCounter++}-${appName}`;
        win.style.zIndex = this.zIndexCounter;

        // Random Position or Centered
        const x = 100 + (this.activeWindows.length * 30);
        const y = 50 + (this.activeWindows.length * 30);
        win.style.left = `${x}px`;
        win.style.top = `${y}px`;

        // Genie Transform Origin
        if (originRect) {
            // Center of the Icon
            const iconCX = originRect.left + originRect.width / 2;
            const iconCY = originRect.top + originRect.height / 2;

            // Origin relative to the Window's top-left
            const originX = iconCX - x;
            const originY = iconCY - y;

            win.style.transformOrigin = `${originX}px ${originY}px`;
        }

        switch (appName) {
            case 'scribe':
                title = "The Scribe";
                appClass = "app-scribe";
                content = `<textarea class="scribe-area" placeholder="Etch your thoughts upon the papyrus..."></textarea>`;
                break;

            case 'oracle':
                title = "The Oracle";
                appClass = "app-oracle";
                content = `
                    <div class="terminal-output" id="term-out-${win.id}">
                        <div>VOID_OS KERNEL [v2.0]</div>
                        <div>Connected to The Nile...</div>
                        <br>
                    </div>
                    <div class="terminal-input-line">
                        <span>></span>
                        <input type="text" class="terminal-input" onkeydown="if(event.key==='Enter') os.handleCommand(this, '${win.id}')">
                    </div>
                `;
                break;

            case 'treasury':
                title = "The Treasury";
                appClass = "app-treasury";
                content = `<div class="file-grid" id="files-${win.id}">Loading Archives...</div>`;
                setTimeout(() => this.loadFiles(win.id), 500);
                break;

            case 'stargate':
                title = "The Stargate";
                appClass = "app-stargate";
                content = `
                    <div class="stargate-controls">
                        <button class="stargate-btn" onclick="os.stargateAction('${win.id}', 'back')"><i class="fas fa-chevron-left"></i></button>
                        <button class="stargate-btn" onclick="os.stargateAction('${win.id}', 'forward')"><i class="fas fa-chevron-right"></i></button>
                        <button class="stargate-btn" onclick="os.stargateAction('${win.id}', 'reload')"><i class="fas fa-redo"></i></button>
                        
                        <div class="url-bar-container">
                            <input type="text" class="stargate-input" value="https://duckduckgo.com" id="nav-${win.id}" 
                                onkeydown="if(event.key==='Enter') os.stargateAction('${win.id}', 'go')">
                        </div>

                        <button class="stargate-btn vpn-btn" id="vpn-${win.id}" onclick="os.toggleVPN('${win.id}')">
                            <i class="fas fa-shield-alt"></i> <span class="vpn-status">VOID_NET: OFF</span>
                        </button>
                    </div>
                    <div class="stargate-viewport">
                        <webview id="view-${win.id}" src="https://duckduckgo.com" style="width:100%; height:100%;" allowpopups></webview>
                    </div>
                `;

                // Attach Listeners after DOM insertion
                setTimeout(() => this.initStargate(win.id), 200);
                break;

            case 'scales':
                title = "Scales of Anubis";
                appClass = "app-scales";
                content = `
                    <div class="scales-container">
                        <div class="scale-arm"></div>
                        <div class="scale-pan left">
                            <i class="fas fa-feather-alt feather"></i>
                        </div>
                        <div class="scale-pan right">
                            <i class="fas fa-heart heart"></i>
                        </div>
                        <div class="scale-base"></div>
                    </div>
                    <div class="stats-readout">
                        <div>CPU: <span id="cpu-${win.id}" style="color:var(--gold-sun)">--</span>%</div>
                        <div>RAM: <span id="ram-${win.id}" style="color:var(--gold-sun)">--</span>%</div>
                    </div>
                `;
                break;

            case 'scarab':
                title = "The Scarab";
                appClass = "app-scarab";
                content = `
                    <div style="padding:20px;">
                        <h3 style="color:var(--gold-sun); margin-bottom:15px;">REALITY SHIFT (Wallpaper)</h3>
                        <div class="wallpaper-grid">
                            <div class="wall-option" onclick="os.setWallpaper('pyramid')" style="background:var(--void-onyx)">PYRAMID</div>
                            <div class="wall-option" onclick="os.setWallpaper('star-chart')" style="background:#111">STAR CHART</div>
                            <div class="wall-option" onclick="os.setWallpaper('void')" style="background:#000">THE VOID</div>
                        </div>
                        <h3 style="color:var(--gold-sun); margin:20px 0 15px 0;">IDENTITY</h3>
                        <button class="auth-btn" style="width:100%" onclick="os.logout()">SEAL THE GATE</button>
                    </div>
                `;
                break;

            case 'game':
                title = "The Exodus";
                appClass = "app-game";
                content = `<canvas id="canvas-${win.id}" width="640" height="480" class="game-canvas" style="width:100%; height:100%"></canvas>`;
                setTimeout(() => this.initTempleGame(win.id), 100);
                break;

            case 'pharaoh':
                title = "The Pharaoh";
                appClass = "app-pharaoh";
                content = `<canvas id="pharaoh-canvas-${win.id}" width="800" height="600" style="width:100%; height:100%; background: #000;"></canvas>`;
                setTimeout(() => this.initPharaohGame(win.id), 100);
                break;
        }

        win.innerHTML = `
            <div class="window-header" onmousedown="os.startDrag(event, '${win.id}')">
                <div class="window-title"><i class="fas fa-square"></i> ${title}</div>
                <div class="window-controls">
                    <div class="control-btn minimize" onclick="os.minimizeWindow('${win.id}')"></div>
                    <div class="control-btn maximize" onclick="os.toggleMaximize('${win.id}')"></div>
                    <div class="control-btn close" onclick="os.closeWindow('${win.id}')"></div>
                </div>
            </div>
            <div class="window-content ${appClass}">
                ${content}
            </div>
        `;

        document.getElementById('window-layer').appendChild(win);
        this.activeWindows.push(win);

        // Initialize App Logic (Post-Mount)
        if (appName === 'scales') this.startMonitoring(win.id);
    }

    closeWindow(id) {
        const win = document.getElementById(id);
        if (win) {
            win.classList.add('window-closing');
            setTimeout(() => win.remove(), 300); // Wait for anim
        }
    }

    /* --- DRAG & DROP LOGISTICS --- */
    dragStart(e, appId) {
        e.dataTransfer.setData("text/plain", appId);
    }

    dropOnDesktop(e) {
        e.preventDefault();
        const appId = e.dataTransfer.getData("text");
        if (!appId) return;

        // Create Desktop Shortcut
        const icon = document.createElement('div');
        icon.className = 'desktop-icon';
        icon.style.left = (e.clientX - 40) + 'px';
        icon.style.top = (e.clientY - 40) + 'px';
        icon.onclick = () => this.openApp(appId);

        // Config Icon
        let iconClass = "fa-square";
        let label = appId;
        if (appId === 'scribe') { iconClass = "fa-scroll"; label = "The Scribe"; }
        if (appId === 'oracle') { iconClass = "fa-terminal"; label = "The Oracle"; }
        if (appId === 'treasury') { iconClass = "fa-box-open"; label = "The Treasury"; }
        if (appId === 'stargate') { iconClass = "fa-globe-africa"; label = "The Stargate"; }
        if (appId === 'scales') { iconClass = "fa-balance-scale"; label = "Scales"; }
        if (appId === 'scarab') { iconClass = "fa-cog"; label = "The Scarab"; }
        if (appId === 'scarab') { iconClass = "fa-cog"; label = "The Scarab"; }
        if (appId === 'game') { iconClass = "fa-cross"; label = "The Exodus"; }
        if (appId === 'pharaoh') { iconClass = "fa-dungeon"; label = "The Pharaoh"; }

        icon.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <div class="desktop-text">${label}</div>
        `;

        document.getElementById('desktop-layer').appendChild(icon);
    }

    dropOnTaskbar(e) {
        e.preventDefault();
        const appId = e.dataTransfer.getData("text");
        if (!appId) return;

        // Check if already exists
        if (document.getElementById(`task-${appId}`)) return;

        // Create Taskbar Icon
        const icon = document.createElement('div');
        icon.className = 'nile-icon';
        icon.id = `task-${appId}`;
        icon.onclick = () => this.openApp(appId);
        icon.title = appId.toUpperCase();

        let iconClass = "fa-square";
        if (appId === 'scribe') iconClass = "fa-scroll";
        if (appId === 'oracle') iconClass = "fa-terminal";
        if (appId === 'treasury') iconClass = "fa-box-open";
        if (appId === 'stargate') iconClass = "fa-globe-africa";
        if (appId === 'scales') iconClass = "fa-balance-scale";
        if (appId === 'scarab') iconClass = "fa-cog";
        if (appId === 'scarab') iconClass = "fa-cog";
        if (appId === 'game') iconClass = "fa-cross";
        if (appId === 'pharaoh') iconClass = "fa-dungeon";

        icon.innerHTML = `<i class="fas ${iconClass}"></i>`;

        document.getElementById('the-nile').appendChild(icon);
    }

    minimizeAll() {
        // Toggle visibility or specific minimization logic
        this.activeWindows.forEach(win => {
            // Implementation optional for now
        });
    }

    /* --- SESSION MANAGEMENT --- */
    logout() {
        // Close all windows
        const windows = [...this.activeWindows]; // Copy array
        windows.forEach(win => this.closeWindow(win.id));

        // Return to Void
        const sanctuary = document.getElementById('the-sanctuary');
        sanctuary.style.opacity = '0';

        setTimeout(() => {
            sanctuary.style.display = 'none';
            this.booted = false;

            // Reboot instead of login
            window.location.reload();
        }, 1000);
    }

    /* --- INTERACTIONS --- */
    startDrag(e, id) {
        this.isDragging = true;
        this.currentDragWindow = document.getElementById(id);
        this.zIndex++;
        this.currentDragWindow.style.zIndex = this.zIndex;

        const rect = this.currentDragWindow.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
    }

    setupDragListeners() {
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.currentDragWindow) {
                this.currentDragWindow.style.left = `${e.clientX - this.dragOffset.x}px`;
                this.currentDragWindow.style.top = `${e.clientY - this.dragOffset.y}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.currentDragWindow = null;
        });
    }

    async handleConsole(e, winId) {
        if (e.key === 'Enter') {
            const input = e.target;
            const cmd = input.value;
            const outputDiv = document.getElementById(`console-${winId}`);

            // Echo command
            outputDiv.innerHTML += `<div class="terminal-line">> ${cmd}</div>`;
            input.value = '';

            // Send to Kernel
            try {
                const res = await fetch('/api/shell/exec', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cmd: cmd })
                });
                const data = await res.json();
                outputDiv.innerHTML += `<div class="terminal-line" style="color:var(--gold-sun)">${data.output}</div>`;
            } catch (err) {
                outputDiv.innerHTML += `<div class="terminal-line" style="color:red">COMMUNICATION_FAILURE</div>`;
            }

            // Scroll to bottom
            outputDiv.scrollTop = outputDiv.scrollHeight;
        }
    }

    /* --- APP LOGIC --- */
    initStargate(winId) {
        const view = document.getElementById(`view-${winId}`);
        const input = document.getElementById(`nav-${winId}`);
        if (!view) return;

        view.addEventListener('did-start-loading', () => {
            input.style.opacity = '0.5';
        });

        view.addEventListener('did-stop-loading', () => {
            input.style.opacity = '1';
            input.value = view.getURL();
        });

        view.addEventListener('did-navigate', (e) => {
            input.value = e.url;
        });

        // Developer Tools (Optional, for debugging)
        // view.openDevTools();
    }

    stargateAction(winId, action) {
        const view = document.getElementById(`view-${winId}`);
        const input = document.getElementById(`nav-${winId}`);
        if (!view) return;

        if (action === 'back' && view.canGoBack()) view.goBack();
        if (action === 'forward' && view.canGoForward()) view.goForward();
        if (action === 'reload') view.reload();
        if (action === 'go') {
            let url = input.value;
            if (!url.includes('.')) {
                // Search
                url = 'https://duckduckgo.com/?q=' + encodeURIComponent(url);
            } else if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            view.loadURL(url);
        }
    }

    toggleMaximize(id) {
        const win = document.getElementById(id);
        if (!win) return;

        if (win.dataset.maximized === "true") {
            // Restore
            win.style.top = win.dataset.prevTop;
            win.style.left = win.dataset.prevLeft;
            win.style.width = win.dataset.prevWidth;
            win.style.height = win.dataset.prevHeight;
            win.dataset.maximized = "false";
            win.classList.remove('maximized');
        } else {
            // Maximize
            const rect = win.getBoundingClientRect();
            win.dataset.prevTop = win.style.top;
            win.dataset.prevLeft = win.style.left;
            win.dataset.prevWidth = win.style.width || rect.width + 'px';
            win.dataset.prevHeight = win.style.height || rect.height + 'px';

            win.style.top = '0';
            win.style.left = '0';
            win.style.width = '100vw';
            win.style.height = 'calc(100vh - 70px)'; // Leave space for taskbar
            win.dataset.maximized = "true";
            win.classList.add('maximized');
        }
    }

    minimizeWindow(id) {
        const win = document.getElementById(id);
        if (win) {
            // Animate only (Genie Shrink)
            // Ideally, we'd mark it as minimized so clicking the icon restores it
            win.style.transition = "all 0.5s ease";
            win.style.transform = "scale(0)";
            win.style.opacity = "0";
            win.style.top = "100%"; // Move towards taskbar
            // win.dataset.minimized = "true";
        }
    }

    toggleVPN(winId) {
        const btn = document.getElementById(`vpn-${winId}`);
        const span = btn.querySelector('.vpn-status');

        // Mock States
        const nodes = [
            "CAIRO-7 (10.99.32.1)",
            "VOID-ALPHA (192.168.0.X)",
            "NUBIA-4 (172.16.88.9)",
            "LUXOR-9 (Secure)"
        ];

        if (btn.classList.contains('active')) {
            // Turn Off
            btn.classList.remove('active');
            span.innerText = "VOID_NET: OFF";
            span.style.color = "#884444"; // Dim Red
            btn.style.borderColor = "#442222";
        } else {
            // Turn On (Reroute)
            span.innerText = "REROUTING...";
            span.style.color = "var(--gold-sun)";

            setTimeout(() => {
                const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
                btn.classList.add('active');
                span.innerText = randomNode;
                span.style.color = "#44ff44"; // Bright Green
                btn.style.borderColor = "#44ff44";
            }, 1000);
        }
    }

    startMonitoring(winId) {
        if (!document.getElementById(winId)) return;

        const fetchStats = async () => {
            if (!document.getElementById(winId)) return;
            try {
                const res = await fetch('/api/system/stats');
                const data = await res.json();

                document.getElementById(`cpu-${winId}`).innerText = data.cpu;
                document.getElementById(`ram-${winId}`).innerText = data.ram;

                // Animate Scales
                const tilt = (data.cpu - 50) / 2; // -25 to +25 deg
                const arm = document.querySelector(`#${winId} .scale-arm`);
                if (arm) arm.style.transform = `rotate(${tilt}deg)`;

                // Color Warning
                const heart = document.querySelector(`#${winId} .heart`);
                if (data.cpu > 80) heart.style.color = "#ff4444";
                else heart.style.color = "#aa4444";

            } catch (e) { }
            setTimeout(fetchStats, 2000);
        };
        fetchStats();
    }

    setWallpaper(type) {
        const bg = document.getElementById('the-sanctuary');
        switch (type) {
            case 'pyramid':
                document.getElementById('pyramid-bg').style.display = 'block';
                bg.style.background = `repeating-linear-gradient(90deg, var(--void-onyx), var(--void-onyx) 50px, #080808 50px, #080808 51px)`;
                break;
            case 'star-chart':
                document.getElementById('pyramid-bg').style.display = 'none';
                bg.style.background = `radial-gradient(circle, #1a1a2e 0%, #000 100%)`;
                // Could add more CSS decoration
                break;
            case 'void':
                document.getElementById('pyramid-bg').style.display = 'none';
                bg.style.background = `#000`;
                break;
        }
    }

    /* --- SCALES OF ANUBIS (System Monitor) --- */
    startMonitoring(winId) {
        const updateStats = async () => {
            // Check if window is still open
            if (!document.getElementById(winId)) return;

            try {
                const response = await fetch('/api/system/stats');
                const data = await response.json();

                const cpuEl = document.getElementById(`cpu-${winId}`);
                const ramEl = document.getElementById(`ram-${winId}`);

                if (cpuEl) cpuEl.innerText = Math.round(data.cpu);
                if (ramEl) ramEl.innerText = Math.round(data.ram);

                // Visual Feedback (Feather vs Heart balance)
                // If heavy load, heart goes down
                const arm = document.querySelector(`#${winId} .scale-arm`);
                if (arm) {
                    const tilt = (data.cpu - 50) / 2; // -25 to +25 deg
                    arm.style.transform = `rotate(${tilt}deg)`;
                }

                setTimeout(updateStats, 2000);
            } catch (e) {
                console.error("Scales broken:", e);
            }
        };
        updateStats();
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    /* --- TEMPLEOS GAME ENGINE (GOD MODE UPGRADE) --- */
    initTempleGame(winId) {
        const canvas = document.getElementById(`canvas-${winId}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // --- CGA PALETTE ---
        const C = {
            Black: '#000000', Blue: '#0000AA', Green: '#00AA00', Cyan: '#00AAAA',
            Red: '#AA0000', Purple: '#AA00AA', Brown: '#AA5500', Gray: '#AAAAAA',
            DarkGray: '#555555', BrBlue: '#5555FF', BrGreen: '#55FF55', BrCyan: '#55FFFF',
            BrRed: '#FF5555', BrPurple: '#FF55FF', Yellow: '#FFFF55', White: '#FFFFFF'
        };

        // --- 3D ENGINE STATE ---
        let cam = { x: 0, y: -100, z: -500, yaw: 0, pitch: 0 };
        let world = { time: 0.1, raining: false }; // Time: 0 (Noon) -> 1 (Midnight)
        const keys = {};

        // Controls
        const handleKeyDown = (e) => keys[e.code] = true;
        const handleKeyUp = (e) => keys[e.code] = false;
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // --- WORLD DATA ---
        // Pyramid Vertices
        const pyrSize = 300;
        const vPyramid = [
            { x: 0, y: -pyrSize, z: 0 },         // 0: Top
            { x: -pyrSize, y: 0, z: -pyrSize },  // 1: FL
            { x: pyrSize, y: 0, z: -pyrSize },   // 2: FR
            { x: pyrSize, y: 0, z: pyrSize },    // 3: BR
            { x: -pyrSize, y: 0, z: pyrSize }    // 4: BL
        ];
        // Pyramid Faces (indices of vertices)
        const fPyramid = [
            { v: [0, 1, 2], color: C.White }, // Front
            { v: [0, 2, 3], color: C.Gray },  // Right
            { v: [0, 3, 4], color: C.DarkGray }, // Back
            { v: [0, 4, 1], color: C.Gray }   // Left
        ];

        // Egyptians (Billboards)
        const egyptians = [];
        for (let i = 0; i < 20; i++) {
            egyptians.push({
                x: (Math.random() - 0.5) * 2000,
                y: 0,
                z: (Math.random() - 0.5) * 2000,
                color: Math.random() > 0.5 ? C.BrCyan : C.White,
                dx: (Math.random() - 0.5) * 10,
                dz: (Math.random() - 0.5) * 10,
                state: 'wander'
            });
        }

        // --- RENDER LOOP ---
        const render = () => {
            if (!document.getElementById(`canvas-${winId}`)) {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
                return;
            }

            // 1. UPDATE CONTROLS
            const speed = keys['ShiftLeft'] ? 20 : 10; // Sprint/Fast Fly
            if (keys['KeyW']) { cam.x += Math.sin(cam.yaw) * speed; cam.z += Math.cos(cam.yaw) * speed; }
            if (keys['KeyS']) { cam.x -= Math.sin(cam.yaw) * speed; cam.z -= Math.cos(cam.yaw) * speed; }
            if (keys['KeyA']) { cam.yaw -= 0.05; }
            if (keys['KeyD']) { cam.yaw += 0.05; }

            // God Mode Flight
            if (keys['Space']) { cam.y -= speed; } // Up (Y is inverted)
            if (keys['ControlLeft']) { cam.y += speed; } // Down

            // Pitch Look
            if (keys['ArrowUp']) { cam.pitch -= 0.05; }
            if (keys['ArrowDown']) { cam.pitch += 0.05; }

            // World Control
            if (keys['Digit1']) { world.time = Math.max(0, world.time - 0.01); } // Dawn
            if (keys['Digit2']) { world.time = Math.min(1, world.time + 0.01); } // Dusk
            if (keys['Digit3'] && !keys['k3_lock']) { world.raining = !world.raining; keys['k3_lock'] = true; }
            if (!keys['Digit3']) keys['k3_lock'] = false;

            // 2. AI UPDATE (Day/Night Cycle)
            const isNight = world.time > 0.6;
            egyptians.forEach(e => {
                if (isNight) {
                    // RUN TO PYRAMID (0,0)
                    const dist = Math.sqrt(e.x * e.x + e.z * e.z);
                    if (dist > 200) {
                        e.x -= (e.x / dist) * 15; // Run fast
                        e.z -= (e.z / dist) * 15;
                    }
                } else {
                    // WANDER
                    e.x += e.dx;
                    e.z += e.dz;
                    if (Math.abs(e.x) > 1500) e.dx *= -1;
                    if (Math.abs(e.z) > 1500) e.dz *= -1;
                }
            });

            // 3. CLEAR & SKY
            // Sky Interpolation (Cyan -> Blue -> Black)
            let skyColor = C.Cyan;
            if (world.time > 0.3) skyColor = C.Blue;
            if (world.time > 0.7) skyColor = C.Black;

            ctx.fillStyle = skyColor;
            ctx.fillRect(0, 0, W, H); // Fill all background

            // Ground (Fade to black at night)
            ctx.fillStyle = isNight ? '#333300' : C.Yellow;
            // Draw floor horizon (approximate based on pitch)
            const horizon = H / 2 + (cam.pitch * 300);
            ctx.fillRect(0, horizon, W, H);

            // 4. PROJECTION HELPER (Now with Pitch)
            const project = (p) => {
                let x = p.x - cam.x;
                let y = p.y - cam.y;
                let z = p.z - cam.z;

                // Yaw Rotation
                let rx = x * Math.cos(-cam.yaw) - z * Math.sin(-cam.yaw);
                let rz = x * Math.sin(-cam.yaw) + z * Math.cos(-cam.yaw);

                // Pitch Rotation (around X axis)
                let y2 = y * Math.cos(cam.pitch) - rz * Math.sin(cam.pitch);
                let z2 = y * Math.sin(cam.pitch) + rz * Math.cos(cam.pitch);

                if (z2 <= 10) return null;

                const fov = 400;
                const scale = fov / z2;
                return {
                    x: W / 2 + rx * scale,
                    y: H / 2 + y2 * scale,
                    scale: scale,
                    dist: z2
                };
            };

            // 5. PREPARE RENDER LIST
            // 5. PREPARE RENDER LIST
            const renderList = [];

            // Pyramid Faces
            fPyramid.forEach(face => {
                const p1 = project(vPyramid[face.v[0]]);
                const p2 = project(vPyramid[face.v[1]]);
                const p3 = project(vPyramid[face.v[2]]);
                if (p1 && p2 && p3) {
                    const dist = (p1.dist + p2.dist + p3.dist) / 3;
                    // Night lighting
                    let col = face.color;
                    if (isNight) col = (col === C.White) ? C.Gray : C.DarkGray;
                    renderList.push({ type: 'face', dist, points: [p1, p2, p3], color: col });
                }
            });

            // Egyptians
            egyptians.forEach(e => {
                const p = project(e);
                if (p) {
                    renderList.push({ type: 'sprite', dist: p.dist, p, color: e.color });
                }
            });

            // 6. SORT & DRAW
            renderList.sort((a, b) => b.dist - a.dist);
            renderList.forEach(item => {
                if (item.type === 'face') {
                    ctx.fillStyle = item.color;
                    ctx.strokeStyle = isNight ? C.Gray : C.Black;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(item.points[0].x, item.points[0].y);
                    ctx.lineTo(item.points[1].x, item.points[1].y);
                    ctx.lineTo(item.points[2].x, item.points[2].y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                } else if (item.type === 'sprite') {
                    const s = item.p.scale;
                    const h = 150 * s;
                    const w = 60 * s;
                    ctx.fillStyle = item.color;
                    ctx.fillRect(item.p.x - w / 2, item.p.y - h, w, h);
                    ctx.fillStyle = C.Brown;
                    ctx.fillRect(item.p.x - w / 4, item.p.y - h - (20 * s), w / 2, 20 * s);
                }
            });

            // 7. WEATHER: RAIN
            if (world.raining) {
                ctx.strokeStyle = isNight ? '#555555' : '#AAAAAA';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < 100; i++) {
                    const rx = Math.random() * W;
                    const ry = Math.random() * H;
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx - 5, ry + 20);
                }
                ctx.stroke();
            }

            // 8. HUD
            ctx.textAlign = 'left';
            ctx.fillStyle = C.Red;
            ctx.font = '16px "Courier New"';
            ctx.fillText(`POS: ${Math.round(cam.x)}, ${Math.round(cam.y)}, ${Math.round(cam.z)}`, 10, 20);
            ctx.fillText(`TIME: ${world.time.toFixed(2)} (${isNight ? 'NIGHT' : 'DAY'})`, 10, 40);
            ctx.fillStyle = C.Yellow;
            ctx.fillText(`[WASD] Move  [ARROWS] Look`, 10, H - 60);
            ctx.fillText(`[SPACE/CTRL] Fly`, 10, H - 40);
            ctx.fillText(`[1/2] Time  [3] Rain`, 10, H - 20);

            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    /* --- PHARAOH GAME (Coffin View) --- */
    initPharaohGame(winId) {
        if (typeof THREE === 'undefined') {
            console.error("Three.js not loaded");
            return;
        }
        const container = document.getElementById(`pharaoh-canvas-${winId}`).parentElement;
        // Remove old canvas if exists to replace with Three.js canvas (or reuse container)
        container.innerHTML = '';

        // --- THREE.JS SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Start pitch black
        scene.fog = new THREE.FogExp2(0x050505, 0.002);

        // --- LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
        scene.add(ambientLight);

        const coffinLight = new THREE.PointLight(0xffaa00, 1, 10);
        coffinLight.position.set(0, 7, 0); // Inside coffin
        scene.add(coffinLight);

        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Force Resize after a short delay to ensure window is open
        setTimeout(() => {
            onWindowResize();
        }, 500);

        // Resize Helper
        const onWindowResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', onWindowResize);

        // --- GAME STATE ---
        let phase = 'coffin';
        let lidProgress = 0.0;
        let isOpening = false;

        // --- GEOMETRY GENERATION ---

        // 1. COFFIN (Player starts inside)
        const coffinGroup = new THREE.Group();
        scene.add(coffinGroup);

        // Coffin Body (Bottom and Sides)
        const coffinMat = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 0.9,
            side: THREE.BackSide // Render inside
        });
        const coffinGeo = new THREE.BoxGeometry(10, 8, 20);
        const coffinMesh = new THREE.Mesh(coffinGeo, coffinMat);
        coffinMesh.position.y = 4; // Raise slightly
        coffinGroup.add(coffinMesh);

        // Coffin Lid
        const lidMat = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 0.9
        });
        const lidGeo = new THREE.BoxGeometry(11, 1, 21);
        const lidMesh = new THREE.Mesh(lidGeo, lidMat);
        lidMesh.position.y = 8.5; // On top
        lidMesh.castShadow = true;
        coffinGroup.add(lidMesh);

        // 2. PYRAMID INTERIOR (The "AAA" Scene)
        const pyramidGroup = new THREE.Group();
        // Initially hidden or dark? No, relies on coffin blocking view.
        scene.add(pyramidGroup);

        // High Peak (Inverted Pyramid)
        const roomGeo = new THREE.ConeGeometry(400, 600, 4, 1, true); // Open bottom?
        const roomMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // Dark stone
            roughness: 0.8,
            side: THREE.BackSide,
            flatShading: true
        });
        const room = new THREE.Mesh(roomGeo, roomMat);
        room.rotation.y = Math.PI / 4; // Align square
        room.position.y = 250; // High ceiling
        pyramidGroup.add(room);

        // Grand Staircase
        const stairsGroup = new THREE.Group();
        const stairMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 });

        for (let i = 0; i < 50; i++) {
            const stepW = 40;
            const stepD = 10;
            const stepH = 2;
            const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stairMat);
            step.position.z = 15 + (i * stepD);
            step.position.y = - (i * stepH);
            step.receiveShadow = true;
            stairsGroup.add(step);

            // Side Pillars/Torches every 5 steps
            if (i % 5 === 0) {
                const pillarGeo = new THREE.BoxGeometry(2, 10, 2);
                const pLeft = new THREE.Mesh(pillarGeo, stairMat);
                pLeft.position.set(-22, step.position.y + 5, step.position.z);
                stairsGroup.add(pLeft);

                const pRight = new THREE.Mesh(pillarGeo, stairMat);
                pRight.position.set(22, step.position.y + 5, step.position.z);
                stairsGroup.add(pRight);

                // Torch Light
                const torchLight = new THREE.PointLight(0xffaa00, 1, 40);
                torchLight.position.set(0, 4, 0);
                pLeft.add(torchLight.clone());
                pRight.add(torchLight.clone());
            }
        }
        pyramidGroup.add(stairsGroup);

        // Coffin Platform (Top of stairs)
        const platformGeo = new THREE.BoxGeometry(60, 5, 80);
        const platform = new THREE.Mesh(platformGeo, stairMat);
        platform.position.y = -2.5;
        platform.position.z = -10;
        platform.receiveShadow = true;
        pyramidGroup.add(platform);

        // INITIAL POSITION (Inside Coffin)
        camera.position.set(0, 5, 5); // Head position inside coffin
        camera.rotation.x = -Math.PI / 2; // Looking UP at lid

        // --- CONTROLS ---
        // Simple First Person
        const keys = {};
        window.addEventListener('keydown', (e) => keys[e.code] = true);
        window.addEventListener('keyup', (e) => keys[e.code] = false);

        container.addEventListener('mousedown', () => {
            if (phase === 'coffin') {
                isOpening = true;
                // Add dramatic sound here?
            } else if (phase === 'pyramid') {
                container.requestPointerLock();
            }
        });

        // Mouse Look
        let yaw = 0;
        let pitch = 0;
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === container) {
                yaw -= e.movementX * 0.002;
                pitch -= e.movementY * 0.002;
                pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

                // If in coffin, restrict movement?
                if (phase === 'coffin') {
                    pitch = Math.max(-Math.PI / 2, Math.min(-0.5, pitch)); // Can only look up mostly
                }
            }
        });

        // --- ANIMATION LOOP ---
        const clock = new THREE.Clock();

        const animate = () => {
            if (!document.getElementById(`pharaoh-canvas-${winId}`)) {
                // Cleanup
                renderer.dispose();
                return;
            }
            requestAnimationFrame(animate);

            const dt = clock.getDelta();

            // LOGIC
            if (phase === 'coffin') {
                if (isOpening) {
                    lidProgress += dt * 0.5; // Open speed
                    if (lidProgress > 1) {
                        lidProgress = 1;
                        phase = 'transition_complete';

                        // Switch from looking UP to looking Forward
                        // Simple interpolation or instant?
                        // Let's reset pitch/yaw for walking
                        pitch = 0;
                        yaw = Math.PI; // Face down stairs
                        phase = 'pyramid';
                    }

                    // Slide Lid
                    lidMesh.position.z = 21 * lidProgress; // Slide forward
                    lidMesh.rotation.x = -lidProgress * 0.2; // Tilt up slightly
                }

                // Camera restricted
                camera.rotation.set(pitch - Math.PI / 2 + (lidProgress * Math.PI / 2), yaw, 0, 'YXZ');

            } else if (phase === 'pyramid') {
                // WASD Movement
                const speed = 10 * dt;
                const dir = new THREE.Vector3();

                if (keys['KeyW']) dir.z -= speed;
                if (keys['KeyS']) dir.z += speed;
                if (keys['KeyA']) dir.x -= speed;
                if (keys['KeyD']) dir.x += speed;

                dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                camera.position.add(dir);

                // Gravity / walking on stairs (Simple height collision)
                // Just flying for now or stick to ground?
                // Stick to ground approx
                // Steps logic: z start 15, stepD 10, stepH 2
                // if z > 15, index = (z-15)/10
                if (camera.position.z > 15) {
                    const stepIdx = Math.floor((camera.position.z - 15) / 10);
                    const targetY = -(stepIdx * 2) + 6; // +6 eye level
                    // Smooth lerp y
                    camera.position.y += (targetY - camera.position.y) * 5 * dt;
                } else {
                    camera.position.y = 8; // Platform height
                }

                // Camera Look
                camera.rotation.set(pitch, yaw, 0, 'YXZ');
            }

            // Flicker Torches
            pyramidGroup.children.forEach(child => {
                if (child.isGroup) { // Stairs group
                    child.children.forEach(stepObj => {
                        if (stepObj.children.length > 0) { // Pillars
                            stepObj.children.forEach(light => {
                                if (light.isPointLight) {
                                    light.intensity = 1 + Math.random() * 0.5;
                                }
                            });
                        }
                    });
                }
            });

            renderer.render(scene, camera);
        };
        animate();
    }
}


// Global Instance
window.os = new VoidOS();
