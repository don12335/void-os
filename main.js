const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        backgroundColor: '#050505', // Match dark theme
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        },
        autoHideMenuBar: true
    });

    // Load the Flask app
    // giving a small delay for Python to start
    setTimeout(() => {
        mainWindow.loadURL('http://127.0.0.1:5000');
    }, 2000); // 2 seconds delay to ensure Flask is up

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startPythonSubprocess() {
    let pythonCmd = 'python';
    if (process.platform === 'linux' || process.platform === 'darwin') {
        pythonCmd = 'python3';
    }

    pythonProcess = spawn(pythonCmd, ['app.py'], {
        cwd: __dirname,
        detached: false
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
    });
}

app.on('ready', () => {
    startPythonSubprocess();
    createWindow();
});

app.on('window-all-closed', function () {
    if (pythonProcess) {
        pythonProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// Ensure python builds are killed on exit
app.on('quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});
