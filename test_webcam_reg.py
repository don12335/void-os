import winreg
import datetime

def list_webcam_usage():
    path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam"
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, path)
        print(f"Scanning Registry: HKCU\\{path}")
        
        i = 0
        while True:
            try:
                app_name = winreg.EnumKey(key, i)
                app_path = f"{path}\\{app_name}"
                
                try:
                    app_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, app_path)
                    try:
                        last_used, _ = winreg.QueryValueEx(app_key, "LastUsedTimeStop")
                        # Usually it's a 64-bit integer (FileTime). 
                        # For now just printing raw to ensure we can read it.
                        print(f"[FOUND] {app_name} - LastUsed: {last_used}")
                    except FileNotFoundError:
                        pass
                except Exception as e:
                    print(f"Error reading app {app_name}: {e}")
                
                i += 1
            except OSError:
                break # No more keys
                
    except Exception as e:
        print(f"Failed to open registry key: {e}")

if __name__ == "__main__":
    list_webcam_usage()
