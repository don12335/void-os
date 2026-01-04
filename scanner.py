import os
import hashlib
import math
import yara
import pefile

class Scanner:
    def __init__(self):
        self.scanned_files = 0
        self.rules = None
        self.is_scanning = False
        self.current_results = []
        self.current_file = ""
        
        # Heuristic Definitions: API capabilities
        self.SUSPICIOUS_IMPORTS = {
            'Process Injection': ['VirtualAllocEx', 'WriteProcessMemory', 'CreateRemoteThread', 'OpenProcess'],
            'Keylogging': ['GetAsyncKeyState', 'SetWindowsHookExA', 'SetWindowsHookExW', 'GetKeyboardState'],
            'Anti-Debugging': ['IsDebuggerPresent', 'CheckRemoteDebuggerPresent', 'OutputDebugStringA'],
            'Network Communication': ['InternetOpenA', 'HttpSendRequestA', 'WSAStartup', 'socket', 'connect'],
            'Persistence': ['RegCreateKeyExA', 'RegSetValueExA', 'ShellExecuteA']
        }

        try:
            # Compile YARA rules
            self.rules = yara.compile(filepath='signatures/main.yar')
            print("YARA rules loaded successfully.")
        except Exception as e:
            print(f"Error loading YARA rules: {e}")

    # ... (calculate_entropy remains unchanged) ...

    def scan_file(self, file_path):
        threats = []
        try:
            with open(file_path, 'rb') as f:
                data = f.read()

            # 1. YARA Scan
            if self.rules:
                matches = self.rules.match(data=data)
                for match in matches:
                    threats.append({
                        'file': file_path,
                        'threat': f"YARA: {match.rule}",
                        'type': 'Signature Match'
                    })

            # 2. Entropy Analysis (Heuristic for Packed Malware)
            entropy = self.calculate_entropy(data)
            if entropy > 7.5:
                 if file_path.lower().endswith(('.exe', '.dll')):
                    threats.append({
                        'file': file_path,
                        'threat': f"High Entropy ({round(entropy, 2)}) - Suspicious/Packed",
                        'type': 'Heuristic'
                    })

            # 3. Deep PE Analysis (Heuristic Engine)
            if file_path.lower().endswith(('.exe', '.dll')):
                try:
                    pe = pefile.PE(data=data) # Load from data bytes directly
                    
                    # 3.1 Section Names
                    for section in pe.sections:
                        name = section.Name.decode('utf-8', 'ignore').strip('\x00')
                        if name in ['.upx', '.fsg', '.aspack']:
                             threats.append({
                                'file': file_path,
                                'threat': f"Suspicious Section: {name}",
                                'type': 'Heuristic'
                            })

                    # 3.2 Import Table Analysis (Behavioral Capabilities)
                    if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
                        imported_apis = set()
                        for entry in pe.DIRECTORY_ENTRY_IMPORT:
                            for imp in entry.imports:
                                if imp.name:
                                    imported_apis.add(imp.name.decode('utf-8', 'ignore'))
                        
                        # Check for malicious capabilities
                        for behavior, apis in self.SUSPICIOUS_IMPORTS.items():
                            matched_apis = [api for api in apis if any(api in imported for imported in imported_apis)]
                            # Threshold: If it imports specific combinations (e.g. 2 or more injection APIs), flag it.
                            # For stricter detection, even 1 might be enough for strong indicators like CreateRemoteThread
                            threshold = 1 if behavior in ['Process Injection', 'Keylogging'] else 2
                            
                            if len(matched_apis) >= threshold:
                                threats.append({
                                    'file': file_path,
                                    'threat': f"CAPABILITY: {behavior} ({', '.join(matched_apis)})",
                                    'type': 'Deep Heuristic'
                                })

                except Exception as e:
                    # Not a valid PE or error parsing
                    pass

        except Exception as e:
            pass
        
        return threats

    def scan_directory(self, path):
        self.is_scanning = True
        self.current_results = []
        self.scanned_files = 0
        
        # Exclusions
        excluded_dirs = {'.git', '__pycache__', 'signatures', 'node_modules', 'venv', 'AppData'}
        excluded_exts = {'.yar', '.yara'}

        for root, dirs, files in os.walk(path):
            if not self.is_scanning: # Allow external cancellation
                break

            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            for file in files:
                if not self.is_scanning:
                    break

                # Skip excluded extensions
                if any(file.endswith(ext) for ext in excluded_exts):
                    continue

                file_path = os.path.join(root, file)
                self.current_file = file_path 
                self.scanned_files += 1
                
                # Perform advanced scan
                try:
                    file_threats = self.scan_file(file_path)
                    if file_threats:
                        self.current_results.extend(file_threats)
                except Exception:
                    continue
        
        self.is_scanning = False
        return self.current_results

    def stop(self):
        self.is_scanning = False

    def get_stats(self):
        return {
            'scanned': self.scanned_files,
            'is_scanning': self.is_scanning,
            'threat_count': len(self.current_results),
            'current_file': self.current_file
        }
