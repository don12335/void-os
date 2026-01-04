rule EICAR_Test_File {
    meta:
        description = "Detects EICAR test file"
        author = "VOID Antivirus"
        severity = "High"
    strings:
        $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" ascii
    condition:
        $eicar
}

rule Suspicious_Webshell_PHP {
    meta:
        description = "Detects common PHP webshell patterns"
        severity = "High"
    strings:
        $s1 = "eval(base64_decode(" nocase
        $s2 = "shell_exec(" nocase
        $s3 = "c99shell" nocase
    condition:
        any of them
}

rule Mimikatz_Memory_Hack {
    meta:
        description = "Detects Mimikatz artifact strings"
        severity = "Critical"
    strings:
        $s1 = "gentilkiwi" wide ascii
        $s2 = "mimikatz" wide ascii
        $s3 = "sekurlsa" wide ascii
    condition:
        2 of them
}

rule Suspicious_Powershell_Encoded {
    meta:
        description = "Detects encoded PowerShell commands often used in malware"
        severity = "Medium"
    strings:
        $s1 = "powershell -e" nocase
        $s2 = "powershell -enc" nocase
        $s3 = "powershell -encodedcommand" nocase
    condition:
        any of them
}
