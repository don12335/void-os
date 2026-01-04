from flask import Flask, render_template, jsonify, request
import os
import time
import random
import datetime
import json
import hashlib
import uuid
import subprocess
import platform

# OS-Specific Imports
IS_LINUX = platform.system() == 'Linux'
if IS_LINUX:
    try:
        import pty
        import fcntl
        import termios
        import struct
    except ImportError:
        pass # Fallback if specific libs missing

app = Flask(__name__)

# --- OS KERNEL CONSTANTS ---
BOOT_SEQUENCE = [
    "INIT_KERNEL_V4.0...",
    "ACCESSING_ANCIENT_ARCHIVES...",
    "DECODING_HIEROGLYPHS...",
    "ALIGNING_STARS...",
    "CONNECTING_TO_THE_NILE...",
    "SYSTEM_READY."
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/os/boot')
def os_boot():
    """Simulates a system boot sequence with logs."""
    return jsonify({
        'sequence': BOOT_SEQUENCE,
        'timestamp': datetime.datetime.now().isoformat()
    })

@app.route('/api/fs/list')
def fs_list():
    """Simulates looking into the 'Treasury' (File System)."""
    # Mock data for now, or could list real files
    path = request.args.get('path', '/')
    
    mock_files = [
        {'name': 'Scroll_of_Truth.txt', 'type': 'file', 'size': '12KB p'},
        {'name': 'Pyramids_Blueprints', 'type': 'dir', 'size': '-'},
        {'name': 'Sacred_Cats', 'type': 'dir', 'size': '-'},
        {'name': 'Ra_Energy_Logs.log', 'type': 'file', 'size': '4MB'}
    ]
    return jsonify({'path': path, 'files': mock_files})

@app.route('/api/shell/exec', methods=['POST'])
def shell_exec():
    """The Oracle answers commands."""
    data = request.get_json()
    cmd = data.get('cmd', '').strip().lower()
    
    if cmd == 'help':
        output = "AVAILABLE COMMANDS: LIST, DATE, WHOAMI, PRAY"
    elif cmd == 'list':
        output = "FILES: Scroll_of_Truth.txt, Pyramids_Blueprints..."
    elif cmd == 'whoami':
        output = "YOU ARE THE HIGH PRIEST OF THE DIGITAL REALM."
    elif cmd == 'pray':
        output = "THE GODS ARE LISTENING..."
    else:
        output = f"UNKNOWN INCANTATION: {cmd}"
        
    return jsonify({'cmd': cmd, 'output': output})

import psutil

# ... (rest of imports)

@app.route('/api/system/stats')
def system_stats():
    """Returns system vital signs (Scales of Anubis)."""
    try:
        # blocked for 0.5s to get real usage
        cpu = psutil.cpu_percent(interval=0.5)
        ram = psutil.virtual_memory().percent
    except Exception as e:
        print(f"STATS ERROR: {e}")
        # Fallback if psutil fails
        cpu = random.randint(10, 90)
        ram = random.randint(30, 80)
    
    # "Judgment" logic
    status = "BALANCED"
    if cpu > 80: status = "HEAVY_HEART"
    
    return jsonify({
        'cpu': cpu,
        'ram': ram,
        'status': status
    })

# --- CORE APPLICATION SUITE API ---

# 1. STARGATE (Browser)
@app.route('/api/sys/launch/firefox', methods=['POST'])
def launch_firefox():
    """Launches Firefox on the host system."""
    try:
        if IS_LINUX:
            # Set DISPLAY if needed, though usually inherited
            subprocess.Popen(['firefox'], start_new_session=True)
        else:
            # Windows fallback
            subprocess.Popen(['start', 'firefox'], shell=True)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 2. THE TREASURY (File System)
@app.route('/api/fs/list')
def fs_list_real():
    """Real file system listing."""
    path = request.args.get('path')
    
    # Default path logic
    if not path:
        if IS_LINUX:
            path = os.path.expanduser("~")
        else:
            path = "C:\\" # Or user home on Windows
            
    if not os.path.exists(path):
        return jsonify({'error': 'Path not found'}), 404

    try:
        items = []
        with os.scandir(path) as it:
            for entry in it:
                items.append({
                    'name': entry.name,
                    'type': 'dir' if entry.is_dir() else 'file',
                    'size': entry.stat().st_size if entry.is_file() else 0
                })
        # Sort: Directories first, then files
        items.sort(key=lambda x: (x['type'] != 'dir', x['name'].lower()))
        return jsonify({'path': path, 'files': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fs/open', methods=['POST'])
def fs_open():
    """Opens a file using the default OS handler."""
    data = request.get_json()
    path = data.get('path')
    
    try:
        if IS_LINUX:
            subprocess.Popen(['xdg-open', path])
        else:
            os.startfile(path)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 3. THE ORACLE (Terminal)
# Simple mock for now, PTY is complex to implement in single file
@app.route('/api/term/exec', methods=['POST'])
def term_exec_real():
    """Executes a single command and returns output (Non-interactive)."""
    data = request.get_json()
    cmd = data.get('cmd')
    
    if not cmd: return jsonify({'output': ''})

    # Security: Block dangerous commands in this simple mode
    if any(x in cmd for x in ['rm -rf', 'mkfs', ':(){ :|:& };:']):
        return jsonify({'output': 'COMMAND FORBIDDEN BY THE GODS.'})

    try:
        # Run command
        result = subprocess.run(
            cmd, 
            shell=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            timeout=5
        )
        return jsonify({'output': result.stdout + result.stderr})
    except Exception as e:
        return jsonify({'output': f"EXECUTION ERROR: {str(e)}"})

# 4. NETWORK (NMCLI Wrapper)
@app.route('/api/net/status')
def net_status():
    """Checks network status via NMCLI (Linux) or Mock (Windows)."""
    if IS_LINUX:
        try:
            # Check for active connection
            res = subprocess.run(['nmcli', '-t', '-f', 'STATE', 'general'], capture_output=True, text=True)
            connected = 'connected' in res.stdout
            
            # Get SSID if connected
            ssid = "Unknown"
            if connected:
                res_wifi = subprocess.run(['nmcli', '-t', '-f', 'ACTIVE,SSID', 'dev', 'wifi'], capture_output=True, text=True)
                for line in res_wifi.stdout.splitlines():
                    if line.startswith('yes:'):
                        ssid = line.split(':')[1]
                        break
            
            return jsonify({'connected': connected, 'ssid': ssid, 'type': 'real'})
        except:
            return jsonify({'connected': False, 'ssid': '', 'error': 'nmcli failed'})
    else:
        # Windows Mock
        return jsonify({'connected': True, 'ssid': 'VOID_NET_WIN', 'type': 'mock'})

@app.route('/api/net/scan')
def net_scan():
    """Scans for WiFi networks."""
    if IS_LINUX:
        try:
            subprocess.run(['nmcli', 'dev', 'wifi', 'rescan'])
            res = subprocess.run(['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY', 'dev', 'wifi'], capture_output=True, text=True)
            networks = []
            for line in res.stdout.splitlines():
                parts = line.split(':') # Simplified parsing
                if len(parts) >= 1 and parts[0]:
                    networks.append({'ssid': parts[0], 'signal': parts[1] if len(parts)>1 else '0'})
            return jsonify({'networks': networks})
        except:
            return jsonify({'networks': []})
    else:
        return jsonify({'networks': [
            {'ssid': 'Pyramid_5G', 'signal': '100'}, 
            {'ssid': 'Nile_Link', 'signal': '80'}
        ]})

@app.route('/api/net/connect', methods=['POST'])
def net_connect():
    data = request.get_json()
    ssid = data.get('ssid')
    password = data.get('password')
    
    if IS_LINUX:
        try:
            cmd = ['nmcli', 'dev', 'wifi', 'connect', ssid]
            if password:
                cmd.extend(['password', password])
            
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': res.stderr})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    
    return jsonify({'success': True, 'mock': True})

# --- AUTHENTICATION LAYER ---
USERS_DB = 'users.json'

def load_users():
    if not os.path.exists(USERS_DB):
        return {}
    with open(USERS_DB, 'r') as f:
        try:
            return json.load(f)
        except:
            return {}

def save_users(users):
    with open(USERS_DB, 'w') as f:
        json.dump(users, f, indent=4)

@app.route('/api/auth/check_init')
def auth_check_init():
    """Checks if any user exists (to trigger Setup Wizard)."""
    users = load_users()
    return jsonify({'initialized': len(users) > 0})

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Missing fields'}), 400
        
    users = load_users()
    if username in users:
        return jsonify({'error': 'User already exists'}), 400
        
    # Hash password
    salt = uuid.uuid4().hex
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    
    users[username] = {
        'password': pwd_hash,
        'salt': salt,
        'settings': {
            'theme': 'void-dark',
            'wallpaper': 'default',
            'taskbar_pins': []
        }
    }
    save_users(users)
    return jsonify({'success': True, 'msg': 'User created'})

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    users = load_users()
    user = users.get(username)
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
        
    # Verify password
    salt = user['salt']
    check_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    
    if check_hash == user['password']:
        return jsonify({
            'success': True, 
            'token': str(uuid.uuid4()), # Mock token for now
            'settings': user['settings']
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401


if __name__ == '__main__':
    try:
        app.run(debug=True, port=5000)
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
