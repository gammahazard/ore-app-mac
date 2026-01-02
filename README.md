# 🛡️ Ore CPU Miner: Desktop Controller (macOS)

![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey?style=for-the-badge&logo=apple)
![Tech](https://img.shields.io/badge/Stack-Node.js_/_Electron-black?style=for-the-badge&logo=electron)
![Security](https://img.shields.io/badge/Logic-Process_Orchestration-blueviolet?style=for-the-badge)

A high-performance desktop wrapper for the **Ore CLI miner**. This application bridges the gap between raw command-line tools and a professional user experience, implementing advanced process orchestration to ensure 24/7 mining uptime.

---

## 🏗️ Architectural Overview

Unlike standard wrappers, this application treats the **Ore CLI** as a managed child process. It utilizes `expect` and `unbuffer` to maintain a persistent, non-blocking stream of miner telemetry, allowing for real-time analysis of difficulty, hash rates, and submission status.

### Resilience Features:
* **Panic Recovery:** Monitors stdout for thread panics and automatically restarts the miner instance to prevent downtime.
* **Dynamic Fee Management:** Implements logic for static/dynamic priority fees and custom RPC routing.
* **State Persistence:** Multi-profile management (up to 5 profiles) with independent difficulty tracking and keypair paths.

---

## 🚀 Key Features

* **Biometric-Ready Security:** Designed with a focus on secure keypair path handling.
* **Smart UI Lifecycle:** Initial dependency validation for **Homebrew**, **Rust**, and **Solana CLI** before the miner environment initializes.
* **Real-time Telemetry:** Live visualization of difficulty averages and top hashes per profile.
* **Transaction Monitoring:** Automated submission tracking with configurable restart thresholds for transaction saturation.

---

## 🛠️ Environment Setup

### Prerequisites
The application performs a system audit on startup, but the following are required for core functionality:

1. **Homebrew:** System package management.
2. **Expect / Unbuffer:** For process stream handling (`brew install expect`).
3. **Rust Toolchain:** To compile/run the underlying Ore-CLI.
4. **Solana CLI:** For on-chain balance and address verification.

---

## 📸 Technical Showcase

| Deployment Stage | System Interface |
| :--- | :--- |
| **Miner Control** | ![Main Interface](https://i.imgur.com/qWD0Nn8.png) |
| **Telemetry** | ![Difficulty Info](https://i.imgur.com/LrMcoEq.png) |
| **Audit Logic** | ![Dependency Check](https://i.imgur.com/HIYhH1Q.png) |

---

## 📄 License & Acknowledgements

* **License:** MIT.
* **Credits:** Built on top of the excellent work by the **Ore CLI** developers and the Rust community.

---
*Developed by Vanguard Secure Solutions.*
