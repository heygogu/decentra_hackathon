# 🧩 Solana Bounty SDK

A modular, hackathon-built **developer tooling platform** that bridges **off-chain collaboration** (GitHub issues, pull requests, comments) with **on-chain escrow-based bounties on Solana**.

This project was built during a hackathon organized by **Decentra Cloud** and **Nova Consortium** and is structured as **three independent but interoperable repositories**:

1. **Solana Program (On-chain logic)**
2. **Bounty Bot Server (Off-chain automation & orchestration)**
3. **solana-bounty-sdk (Developer SDK)**

Each component can be set up and run independently, but together they form a complete end-to-end bounty workflow.

---

## 🧠 High-Level Concept

> **Money is promised off-chain, but work happens on-chain nowhere.**

This platform fixes that gap.

* Bounties are *declared and managed off-chain* (GitHub issues, comments, labels)
* Funds are *secured on-chain* using a Solana escrow program
* Claims, validations, and payouts become **verifiable, automated, and trust-minimized**

---

## 📦 Repository Overview

### 1️⃣ Solana Program (Escrow Logic)

This is the **on-chain Rust program** responsible for:

* Creating bounty escrows
* Locking funds securely
* Validating claims
* Releasing payouts

**Explorer (Devnet):**
[https://explorer.solana.com/address/GrDTkJbiCU8F9nQE3aqBbNt3tFnH5RHPNMbFJ9j6Hhzy?cluster=devnet](https://explorer.solana.com/address/GrDTkJbiCU8F9nQE3aqBbNt3tFnH5RHPNMbFJ9j6Hhzy?cluster=devnet)

---

### 2️⃣ Bounty Bot Server

A **Node.js server** that:

* Receives GitHub webhook events
* Listens for issue comments, labels, PR merges
* Talks to the Solana program via the SDK
* Acts as the bridge between GitHub and Solana

---

### 3️⃣ solana-bounty-sdk

A reusable **JavaScript/TypeScript SDK** that abstracts:

* Solana program interactions
* Escrow creation & claim flows
* Provider-based extensions (GitHub, GitLab, Bitbucket, Slack, Email, Webhooks, etc.)

Published on npm:

[https://www.npmjs.com/package/solana-bounty-sdk](https://www.npmjs.com/package/solana-bounty-sdk)

---

## 🛠 Prerequisites

Make sure the following are installed:

* **Node.js** (v18+ recommended)
* **npm**
* **Rust & Cargo** (versions as specified in `Cargo.toml`)
* **Solana CLI**
* A **GitHub account** (to create a GitHub App)

---

## 🚀 Setup Instructions

---

## 🔹 1. Bounty Bot Server Setup

### Step 1: Install dependencies

```bash
npm install
```

### Step 2: Environment variables

```bash
cp .env.example .env
```

Fill in all required values inside `.env`.

Typical variables include:

* GitHub App credentials
* Webhook secrets
* Solana RPC URL
* Private keys / payer config

---

### Step 3: Create a GitHub App

You **must** create a GitHub App and install it on the repository you want to enable bounties for.

Required permissions:

* **Issues** – Read & Write
* **Pull Requests** – Read & Write
* **Metadata** – Read

Webhook configuration:

* Set a webhook URL pointing to your running server
* Enable relevant events (issues, issue comments, pull requests)

Once installed, copy the App credentials into your `.env` file.

---

### Step 4: Run the server

```bash
npm run dev
```

At this point, the bounty bot server should be running and ready to receive GitHub events.

---

## 🔹 2. Solana Program Setup

### Step 1: Verify Rust toolchain

Ensure your Rust and Cargo versions match the ones specified in `Cargo.toml`.

---

### Step 2: Build the program

```bash
cargo build-sbf
```

After a successful build, you will find the compiled program binary at:

```
target/deploy/*.so
```

---

### Step 3: Deploy to Solana

Make sure `solana-cli` is installed and configured.

```bash
solana config set --url devnet
solana deploy target/deploy/<program_name>.so
```

You can deploy to **devnet**, **testnet**, or **mainnet** depending on your needs.

---

## 🔹 3. solana-bounty-sdk Setup

### Option A: Use from npm (Recommended)

```bash
npm install solana-bounty-sdk
```

Refer to the SDK `README.md` for usage examples and APIs.

---

### Option B: Manual deployment to npm

If you want to publish your own version:

#### Step 1: Login to npm

```bash
npm login
```

---

#### Step 2: Create an npm access token

* Go to npm settings
* Create a token with full publish permissions

Configure it locally:

```bash
npm config set //registry.npmjs.org/:_authToken=<your_token>
```

---

#### Step 3: Publish

```bash
npm publish
```

---

## 🔌 Extensibility & Architecture

The SDK follows a **provider-based architecture**:

* Issue providers (GitHub, GitLab, Bitbucket)
* Notification providers (Slack, Email, Webhooks)

To add a new platform:

* Implement the provided interface
* Plug it into the SDK
* No core changes required

This makes the system **highly modular and future-proof**.

---

## 🧪 Demo Flow (Typical)

1. Maintainer creates a GitHub issue
2. Bounty is attached via comment or label
3. Funds are locked on Solana
4. Contributor completes work and merges PR
5. Claim is verified automatically
6. Escrow releases payout on-chain

---

## 🏗 Project Status

* ✅ Core escrow logic complete
* ✅ GitHub automation live
* ✅ SDK published
* 🔄 More providers & UX improvements planned

---

## 🧬 Hackathon Context

Built as part of a hackathon organized by **Decentra Cloud** and **Nova Consortium** with a strong focus on:

* Developer tooling
* Web3 infra
* Real-world automation

---

## 📜 License

MIT (unless specified otherwise in individual repos)

---

## 🤝 Contributions

Contributions, extensions, and integrations are welcome. This project is designed to grow into a full-fledged **Web3 developer bounty infrastructure**.

---

Happy hacking 🚀
