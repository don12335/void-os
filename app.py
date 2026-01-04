from flask import Flask, render_template, jsonify, request
import os
import time
import random
import datetime
import json

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

# --- AUTHENTICATION LAYER REMOVED ---


if __name__ == '__main__':
    try:
        app.run(debug=True, port=5000)
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
