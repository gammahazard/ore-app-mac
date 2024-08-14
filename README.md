
# Ore CPU Miner App for Mac

Welcome to the source code repository for the Ore CPU Miner App for macOS. This app is designed to make mining with your CPU using the Ore CLI more user-friendly.



## Requirements

To get started with the Ore CPU Miner App, you'll need to have the following installed on your macOS, the app will attempt to locate if you have these installed or not:

- **Homebrew**
- **unbuffer** (included with expect)
- **expect**
- **Rust**
- **Ore CLI**
- **Solana CLI**

## Installation

Follow the steps below to set up the environment and install the necessary dependencies:

### 1. Install Homebrew

Homebrew is a package manager for macOS. If you don't already have it installed, you can install it using the following command:


```/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"```

### 2. Install Expect and Unbuffer

Expect, which includes unbuffer, is required for the app. You can install it via Homebrew:


```brew install expect```

### 3. Install Rust

Rust is needed to compile the Ore CLI. If you don't have Rust installed, you can install it by running the following command in your terminal:

```curl https://sh.rustup.rs -sSf | sh```

### 4. Install Ore CLI

Once Rust is installed, you can install the Ore CLI using Cargo, Rust's package manager:


```cargo install ore-cli```

## Usage

After installing all the necessary dependencies, you can start using the Ore CPU Miner App. The app provides a user-friendly interface to mine with your CPU using the Ore CLI.

### Features

- **Claim, Stake, Transfer ORE**
- **Set up to 5 different profiles, track average difficulty and top hashes for each profile**
- **Easily set up custom options for your miner, including specifying dynamic/static priority fee, dynamic fee RPC URL, max dynamic fee, custom RPC URL, custom keypair path, and a fee payer path**
- **Balance is dynamically updated when claiming, staking and mining**
- **Indicate # of tx submissions before miner will restart**
- **Automatic restarting when miner panicks**
- **Initial check for installed software, with the ability to bypass incase it fails**
- **Solana CLI addition, display solana address and balance within UI, balance is updated dynamically**

### Screenshots

- **Main Interface:** ![Main Interface](https://i.imgur.com/qWD0Nn8.png)
- **Difficulty Info:** ![Difficulty Info](https://i.imgur.com/LrMcoEq.png)
- **Mining:** ![Mining](https://i.imgur.com/BA5WbbJ.png)
- **Automatic Restarts on panick and max submissions** ![Automatic Restarts](https://i.imgur.com/QjWM2PA.png)
- **Software and dependency check before miner loads** ![Dependency Check](https://i.imgur.com/HIYhH1Q.png)

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have suggestions for improvements or find any bugs.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

Special thanks to the developers and community behind Homebrew, Rust, and the chad who created Ore CLI for providing the tools that make this project possible.

---

Thank you for using the Ore CPU Miner App for macOS!