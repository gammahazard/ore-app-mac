# Autonomous Process Supervisor (macOS / Electron)

![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey?style=for-the-badge&logo=apple)
![Tech](https://img.shields.io/badge/Stack-Node.js_/_Electron-black?style=for-the-badge&logo=electron)
![Security](https://img.shields.io/badge/Logic-Self_Healing_Systems-blueviolet?style=for-the-badge)

A high-availability systems controller for the **Ore CLI miner**. This application acts as a **Process Supervisor**, bridging the gap between raw command-line tools and enterprise-grade reliability. It implements advanced **Child Process Orchestration** to ensure 24/7 uptime without user intervention.

---

## 🏗️ Architectural Overview

Unlike standard UI wrappers, this application treats the **Ore CLI** as a managed subservient process. It utilizes `expect` and `unbuffer` to maintain a persistent, non-blocking stream of telemetry, allowing for real-time analysis of thread health, difficulty metrics, and submission status.

### Resilience & Self-Healing:
* **Automated Panic Recovery:** The supervisor monitors `stdout` for thread panics or Rust-level errors. Upon detection, it automatically kills and respawns the worker process (Self-Healing), preventing stalled states.
* **Dynamic Resource Management:** Implements logic for static/dynamic priority fees based on network congestion.
* **State Persistence:** Multi-profile management (up to 5 profiles) with isolated difficulty tracking and non-custodial keypair mapping.

---

## 🚀 Key Features

* **Environment Integrity Check:** Performs a startup audit to validate dependencies (**Homebrew**, **Rust**, **Solana CLI**) before initialization.
* **Non-Blocking I/O:** Decouples the UI thread from the mining logic to ensure the interface remains responsive during high-load hashing.
* **Real-time Telemetry:** Visualizes difficulty averages and hash rates via IPC (Inter-Process Communication) bridges.
* **Transaction Saturation Logic:** Automated submission tracking with configurable restart thresholds to prevent API rate limiting.

---

## 🛠️ Environment Setup

### Prerequisites
The application acts as a system auditor on startup, requiring:

1.  **Homebrew:** System package management.
2.  **Expect / Unbuffer:** For process stream handling (`brew install expect`).
3.  **Rust Toolchain:** To compile/run the underlying binaries.
4.  **Solana CLI:** For on-chain interactions.

---

## 📸 Technical Showcase

| Deployment Stage | System Interface |
| :--- | :--- |
| **Supervisor Dashboard** | ![Main Interface](https://i.imgur.com/qWD0Nn8.png) |
| **Telemetry Analysis** | ![Difficulty Info](https://i.imgur.com/LrMcoEq.png) |
| **Startup Audit** | ![Dependency Check](https://i.imgur.com/HIYhH1Q.png) |

---

## 📄 License & Acknowledgements

* **License:** MIT.
* **Core Logic:** Orchestrates the **Ore CLI** (Rust) via Node.js child_process.

---
*Developed by Vanguard Secure Solutions.*
