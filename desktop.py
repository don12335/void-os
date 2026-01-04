import webview
import threading
import time
import sys
from app import app

def start_server():
    # Run the flask app in a separate thread
    # Setting debug=False because debug mode reloader causes issues in threads
    app.run(port=5000, debug=False, use_reloader=False)

def main():
    # Start the Flask server in a daemon thread
    t = threading.Thread(target=start_server)
    t.daemon = True
    t.start()

    # Give the server a moment to start
    time.sleep(1)

    # Create the window
    webview.create_window(
        'VOID Antivirus', 
        'http://127.0.0.1:5000',
        width=1000,
        height=800,
        resizable=True,
        background_color='#050505' # Match our dark theme
    )

    # Start the webview GUI
    webview.start()
    
    # When the window closes, the script ends, killing the daemon thread

if __name__ == '__main__':
    main()
