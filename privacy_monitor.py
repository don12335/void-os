import winreg
import time

class WebcamMonitor:
    def __init__(self):
        self.registry_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam"

    def get_active_apps(self):
        active_apps = []
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, self.registry_path)
            i = 0
            while True:
                try:
                    sub_key_name = winreg.EnumKey(key, i)
                    active_apps.extend(self._check_app(sub_key_name))
                    i += 1
                except OSError:
                    break
        except Exception as e:
            # print(f"Error accessing webcam registry: {e}")
            pass
            
        return active_apps

    def _check_app(self, app_name):
        results = []
        try:
            # Construct path to the app's key
            app_path = f"{self.registry_path}\\{app_name}"
            app_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, app_path)
            
            try:
                # Read Start and Stop times
                # Windows uses 64-bit integers (FileTime) for these timestamps
                try:
                    start_time, _ = winreg.QueryValueEx(app_key, "LastUsedTimeStart")
                except FileNotFoundError:
                    start_time = 0
                    
                try:
                    stop_time, _ = winreg.QueryValueEx(app_key, "LastUsedTimeStop")
                except FileNotFoundError:
                    stop_time = 0

                # Determine if active
                # If Start > Stop, it means it started recently and hasn't stopped yet.
                # However, sometimes they are equal or specific behaviors occur.
                # Strictly Start > Stop is the best indicator for "Currently Running".
                
                if start_time > 0 and start_time > stop_time:
                    # Beautify the app name
                    clean_name = app_name.split('_')[0] if '_' in app_name else app_name
                    # Handle "NonPackaged" apps (classic .exe)
                    if clean_name == "NonPackaged":
                        # Usually these have sub-keys or just a hash. 
                        # For simplicity, we flag "Unknown Desktop App" or try to dig deeper if needed.
                        # Actually NonPackaged stores paths in subkeys usually.
                        # Let's just return "External Application" for now or the name if readable.
                        clean_name = "Desktop Application"
                        
                    results.append(clean_name)

            except Exception:
                pass
            finally:
                winreg.CloseKey(app_key)
                
        except Exception:
            pass
            
        return results
