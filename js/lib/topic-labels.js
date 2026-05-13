/* =========================================================================
   Friendly labels for topic codes used in questions[].topics.
   Falls back to a heuristic prettifier if no explicit label is registered.
   ========================================================================= */

const EXPLICIT = {
  // Acronyms that need expansion
  ABI: "ABI (Application Binary Interface)",
  ACL: "Access Control Lists",
  ARP: "ARP (Address Resolution Protocol)",
  ATO: "Authority to Operate",
  "CAT-codes": "DoD CAT incident codes",
  CFS: "Linux CFS scheduler",
  CIDR: "CIDR (Classless Inter-Domain Routing)",
  CMF: "Cyber Mission Force",
  CMT: "Combat Mission Teams",
  COA: "Course of Action",
  CPT: "Cyber Protection Teams",
  C10F: "U.S. Tenth Fleet (C10F)",
  DCO: "Defensive Cyberspace Operations",
  DEP: "DEP / NX (Data Execution Prevention)",
  DODIN: "DODIN Operations",
  EW: "Electronic Warfare",
  EtherType: "Ethernet EtherType",
  FLTCYBERCOM: "Fleet Cyber Command",
  HKCU: "Windows Registry: HKCU",
  HKLM: "Windows Registry: HKLM",
  IA: "Information Assurance",
  ICMP: "ICMP",
  IDS: "Intrusion Detection",
  IO: "Information Operations",
  IOC: "Indicators of Compromise",
  IPv6: "IPv6",
  "IR-lifecycle": "Incident Response lifecycle",
  JPP: "Joint Planning Process",
  Linux: "Linux",
  "MITRE-ATTACK": "MITRE ATT&CK Framework",
  MMU: "MMU / Paging",
  NAVIFOR: "Naval Information Forces",
  NDA: "Nondisclosure Agreement",
  NMT: "National Mission Teams",
  NX: "DEP / NX (Data Execution Prevention)",
  OCA: "Original Classification Authority",
  OSI: "OSI Reference Model",
  "OSI-1": "OSI Layer 1 (Physical)",
  "OSI-2": "OSI Layer 2 (Data Link)",
  "OSI-3": "OSI Layer 3 (Network)",
  "OSI-4": "OSI Layer 4 (Transport)",
  "OSI-5": "OSI Layer 5 (Session)",
  "OSI-6": "OSI Layer 6 (Presentation)",
  "OSI-7": "OSI Layer 7 (Application)",
  PAM: "Linux PAM",
  PCB: "Process Control Block",
  PEB: "Process Environment Block",
  PII: "Personally Identifiable Information",
  PtH: "Pass-the-Hash",
  PtT: "Pass-the-Ticket",
  RAID: "RAID levels",
  RBAC: "Role-Based Access Control",
  RFC: "RFCs",
  RPF: "Reverse Path Forwarding",
  SCADA: "SCADA / ICS",
  SCI: "SCI handling",
  SIEM: "SIEM",
  SIGINT: "SIGINT compliance",
  SLAAC: "IPv6 SLAAC",
  SMB: "SMB / CIFS",
  SNMPv3: "SNMP v3",
  SNMP: "SNMP",
  SOAR: "SOAR",
  SOP: "Standard Operating Procedure",
  SQL: "SQL",
  SROE: "Standing Rules of Engagement",
  SRS: "Spaced Repetition (SM-2)",
  SSH: "SSH",
  SSP: "System Security Plan",
  SUID: "SUID / SGID",
  SYN: "TCP SYN flag",
  TCP: "TCP",
  "TCP-states": "TCP state machine",
  TLB: "TLB (Translation Lookaside Buffer)",
  TLS: "TLS / SSL",
  "TLS-1.3": "TLS 1.3",
  "T1059": "MITRE T1059 (Command and Scripting Interpreter)",
  TTP: "Tactics, Techniques, and Procedures",
  UAC: "Windows UAC",
  UDP: "UDP",
  USCYBERCOM: "U.S. Cyber Command",
  USSID: "USSID Compliance",
  VLAN: "VLANs",
  VPN: "VPNs",
  WPA2: "WPA2",
  WPA3: "WPA3",
  YARA: "YARA rules",
  bash: "Bash shell scripting",
  "C++": "C++",
  C: "C language",
  cli: "Command-line",
  cryptography: "Cryptography",
  "cyber-kill-chain": "Cyber Kill Chain",
  "cyberspace-layers": "Cyberspace layers",
  "cyberspace-ops": "Cyberspace Operations",
  "defense-in-depth": "Defense in Depth",
  display: "Display & UI",
  drilling: "Drilling",
  encryption: "Encryption",
  exam: "Exam mode",
  flashcards: "Flashcards",
  forensics: "Digital forensics",
  hashing: "Hashing",
  "incident-handling": "Incident Handling",
  "information-security": "Information Security",
  install: "Installation",
  "joint-doctrine": "Joint Doctrine",
  "joint-instruction": "Joint Instruction",
  "joint-planning": "Joint Planning",
  john: "John the Ripper",
  "john-the-ripper": "John the Ripper",
  kerberos: "Kerberos",
  malware: "Malware",
  "malware-analysis": "Malware Analysis",
  "memory-protection": "Memory Protection",
  metasploit: "Metasploit",
  meterpreter: "Meterpreter",
  networking: "Networking",
  nmap: "Nmap",
  "operating-systems": "Operating Systems",
  paging: "Paging / Virtual memory",
  password: "Password security",
  "password-cracking": "Password Cracking",
  payload: "Exploit payloads",
  permissions: "Permissions",
  persistence: "Persistence",
  ping: "Ping",
  "personnel-security": "Personnel Security",
  "process-states": "Process States",
  "publication-lookup": "Which publication?",
  "pyramid-of-pain": "Pyramid of Pain",
  python: "Python",
  recon: "Reconnaissance",
  registry: "Windows Registry",
  routing: "Routing",
  scanning: "Network Scanning",
  scheduling: "Scheduling",
  security: "Security",
  shell: "Shell scripting",
  "shell-scripting": "Shell scripting",
  "social-engineering": "Social Engineering",
  snort: "Snort IDS",
  "sticky-bit": "Sticky bit",
  "subnet-mask": "Subnet masks",
  subnetting: "Subnetting",
  "syscall": "System Calls",
  syscalls: "System Calls",
  "system-calls": "System Calls",
  syslog: "Syslog",
  syssvc: "Windows Services",
  "tcp-states": "TCP state machine",
  technique: "Technique",
  "technical-deconfliction": "Technical Deconfliction",
  ticket: "Kerberos tickets",
  "topic-codes": "Topic codes",
  topology: "Topology",
  training: "Training",
  troubleshooting: "Troubleshooting",
  unix: "UNIX",
  vim: "Vim",
  volatility: "Volatility (memory)",
  "wireshark": "Wireshark",
  windows: "Windows",
  "x86-64": "x86-64",
  "windows-credentials": "Windows Credentials",
  "windows-internals": "Windows Internals",
  "view-routing": "Navigation",
};


/** Prettify a single topic code. Falls back to title-casing the code. */
export function topicLabel(code) {
  if (!code) return "";
  if (EXPLICIT[code]) return EXPLICIT[code];
  // Heuristic: if it's all-uppercase or has hyphens, leave hyphens as separators and title-case word parts
  // Otherwise: split on hyphens and underscore, title-case each segment.
  const isAllUpper = code === code.toUpperCase() && /[A-Z]/.test(code);
  if (isAllUpper && code.length <= 5) return code;          // keep short acronyms verbatim
  return code
    .split(/[-_]/g)
    .map((part) =>
      part.length === 0
        ? ""
        : part === part.toUpperCase()
        ? part                            // keep ALL-CAPS segment as-is (e.g., USCYBERCOM)
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prettify "topic:CODE" filter strings used in dropdowns. */
export function filterLabel(code) {
  if (code === "all") return "All topics";
  if (code === "weak") return "Weak areas (lowest ease)";
  if (code.startsWith("topic:")) {
    const t = code.slice("topic:".length);
    return topicLabel(t);
  }
  return code;
}
