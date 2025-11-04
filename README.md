# VeriSol Protocol

**Zero-Knowledge GitHub Developer Attestations on Solana**

VeriSol enables developers to mint compressed NFTs (cNFTs) that cryptographically prove their GitHub contributions without revealing sensitive data. Built with Anchor, Bubblegum, and Circom.

## 🎥 Demo

[![VeriSol Demo](https://img.shields.io/badge/Watch%20Demo-Loom-00D2FF?style=for-the-badge&logo=loom)](https://www.loom.com/share/85f329ec60da4b4c807e1afb7964d32e)

**[📺 Watch the full demonstration →](https://www.loom.com/share/85f329ec60da4b4c807e1afb7964d32e)**

See VeriSol in action: wallet connection, GitHub OAuth, ZK proof generation, and compressed NFT minting on Solana devnet.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Rust and Cargo
- Solana CLI configured for devnet
- Anchor CLI 0.29+
- Git

### 1. Clone and Setup

```bash
git clone https://github.com/krewdev/solana-zk.git
cd solana-zk
npm install
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp frontend/.env.local.example frontend/.env.local
```

**Required Environment Variables:**

```bash
# GitHub OAuth (create at https://github.com/settings/developers)
GITHUB_ID=your_github_app_id
GITHUB_SECRET=your_github_app_secret

# NextAuth (generate: openssl rand -base64 32)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Helius API (get free key at https://helius.xyz)
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key

# Program deployment (auto-populated by setup scripts)
NEXT_PUBLIC_PROGRAM_ID=mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6
NEXT_PUBLIC_MERKLE_TREE=will_be_generated
NEXT_PUBLIC_TREE_AUTHORITY=will_be_generated
```

### 3. Deploy & Configure

```bash
# 1. Build and deploy the Solana program
cd solana-program
anchor build
anchor deploy

# 2. Create compressed NFT infrastructure
cd ..
node setup-real-cnft.mjs

# 3. Install frontend dependencies
cd frontend
npm install
```

### 4. Launch Development Environment

```bash
# Start frontend (from frontend/ directory)
npm run dev

# Visit http://localhost:3000
```

## 🏗️ Architecture

### Core Components

- **Anchor Program** (`solana-program/`): On-chain ZK proof verification + cNFT minting
- **Next.js Frontend** (`frontend/`): Wallet integration, GitHub OAuth, proof generation
- **Circom Circuit** (`zk-circuit/`): Zero-knowledge proof system for GitHub data
- **Setup Scripts** (root): Automated Merkle tree and infrastructure deployment

### Key Features

- **Privacy-Preserving**: Prove GitHub activity without exposing specific repos/commits
- **Compressed NFTs**: Low-cost attestations using Metaplex Bubblegum
- **Flexible Verification**: Support for multiple proof types and verifiers
- **Developer UX**: Simple wallet connection + GitHub OAuth flow

## 📋 Usage Workflow

1. **Connect Wallet**: Phantom, Backpack, or other Solana wallet
2. **GitHub Authentication**: OAuth login to access profile data
3. **Select Verifier**: Choose proof type (follower count, repo count, etc.)
4. **Generate Proof**: Client-side ZK proof generation using snarkjs
5. **Mint cNFT**: On-chain verification + compressed attestation minting
6. **Verify On-Chain**: Public verification of attestations

## 🛠️ Development

### Building the Program

```bash
cd solana-program
anchor build
anchor test
```

### Frontend Development

```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint checks
```

### ZK Circuit Updates

```bash
cd zk-circuit
node run_proof.mjs   # Recompile circuit and generate test proof

# Update frontend assets
cp circuit.wasm ../frontend/public/zk/
cp circuit_final.zkey ../frontend/public/zk/

# Update program verification key
node convert-vk.mjs  # Updates solana-program/src/verifier.rs
```

## 📁 Project Structure

```
├── frontend/                    # Next.js application
│   ├── components/             # React components
│   ├── pages/                  # Next.js routes
│   ├── lib/                    # Anchor IDL and utilities
│   └── public/zk/              # Circuit artifacts
├── solana-program/             # Anchor Solana program
│   ├── src/lib.rs              # Main program logic
│   ├── src/verifier.rs         # ZK proof verification
│   └── tests/                  # Program tests
├── zk-circuit/                 # Circom ZK circuit
│   ├── circuit.circom          # Circuit definition
│   └── run_proof.mjs           # Build and test script
├── zk-artifacts/               # Compiled circuit outputs
└── *.mjs                       # Setup and utility scripts
```

## 🚀 Deployment

### Mainnet Deployment

1. **Configure Mainnet**:
   ```bash
   solana config set --url https://api.mainnet-beta.solana.com
   ```

2. **Update Program ID**:
   ```bash
   # In solana-program/src/lib.rs and frontend/.env.local
   # Generate: solana-keygen new -o deploy-keypair.json
   ```

3. **Deploy Program**:
   ```bash
   cd solana-program
   anchor build
   anchor deploy --provider.cluster mainnet
   ```

4. **Create Production Tree**:
   ```bash
   node setup-real-cnft.mjs
   ```

### Environment Variables for Production

Update `frontend/.env.local` with production values:
- GitHub OAuth app with production callback URL
- Mainnet RPC endpoint (Helius, QuickNode, etc.)
- Production domain for `NEXTAUTH_URL`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Live Demo](https://verisol.vercel.app) (when deployed)
- [Documentation](https://docs.verisol.dev) (coming soon)
- [Discord](https://discord.gg/verisol) (coming soon)

---

**Built with ❤️ for the Solana ecosystem**
- `frontend/`: Next.js 14 app with wallet + GitHub OAuth, proof generation, and mint workflows.
- `zk-circuit/` & `zk-artifacts/`: Circom sources, trusted-setup automation, and ready-to-use proving/verifying keys.
- Root scripts for allocating Bubblegum merkle trees and syncing environment files.

Use this document to go from clone to a working demo or redeployable build.

## Quick Start

```bash
git clone https://github.com/krewdev/solana-zk.git
cd solana-zk

# Install root utilities (tree setup scripts)
npm install

# Install frontend deps
cd frontend
npm install

# Copy env template and fill in secrets
cp .env.local.example .env.local

# Start the Next.js dev server
npm run dev
```

Visit `http://localhost:3000` to connect a devnet wallet, sign in with GitHub, and test proof generation. See [Environment Variables](#environment-variables) for the required values.

## Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node.js | >= 18 | Required for frontend and scripts. |
| npm | >= 9 | Matches the generated lockfiles. |
| Rust toolchain | stable | Needed for Anchor builds. |
| Solana CLI | >= 1.18 | Configure to devnet with `solana config set --url https://api.devnet.solana.com`. |
| Anchor CLI | >= 0.29 | `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked`. |
| Circom (optional) | 2.1+ | Only needed if you regenerate zk artifacts. |

Before running anything, ensure your Solana CLI has a funded devnet keypair:

```bash
solana-keygen new --outfile ~/.config/solana/id.json   # skip if you already have one
solana config set --url https://api.devnet.solana.com
solana airdrop 2
```

## Environment Variables

Duplicate `frontend/.env.local.example` and provide real values:

```
GITHUB_ID=...                  # GitHub OAuth App Client ID
GITHUB_SECRET=...              # GitHub OAuth App Secret
NEXTAUTH_SECRET=...            # Random 32-byte string (openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_HELIUS_API_KEY=... # Optional but recommended for RPC performance
NEXT_PUBLIC_PROGRAM_ID=...     # Anchor program ID (defaults to mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6)
NEXT_PUBLIC_MERKLE_TREE=...    # Bubblegum tree public key
NEXT_PUBLIC_TREE_AUTHORITY=... # Derived authority PDA for the tree
```

When the tree setup scripts run they automatically patch `frontend/.env.local` with the latest tree addresses.

## Building the Anchor Program

```bash
cd solana-program
anchor build                # produces target/idl and target/types

# Optional: deploy your own program id. Requires Anchor wallet funding.
anchor deploy

# Copy refreshed IDL and type definitions into the frontend if you redeploy
cp target/idl/aletheia_protocol.json ../frontend/lib/
cp target/types/aletheia_protocol.ts ../frontend/lib/
```

The verifier currently accepts any non-empty payload for demo purposes. Uncomment the real Groth16 verification path in `solana-program/src/verifier.rs` once you regenerate `zk-artifacts/verification_key.json`.

Run the TypeScript integration tests against devnet (mocks proof responses):

```bash
anchor test
```

## ZK Circuit Tooling

- Precompiled artifacts live in `zk-artifacts/` and are mirrored to `frontend/public/zk/`.
- To rebuild the circuit and keys:

	```bash
	cd zk-circuit
	npm install
	node run_proof.mjs              # orchestrates compilation, powers of tau, key gen, proof
	cp verification_key.json ../zk-artifacts/
	cp circuit_final.zkey ../zk-artifacts/
	cp circuit_js/circuit.wasm ../frontend/public/zk/
	cp ../zk-artifacts/circuit_final.zkey ../frontend/public/zk/
	```

- After updating keys, refresh `solana-program/src/verifier.rs` with the new constants and rebuild/deploy the Anchor program.

## Merkle Tree + Bubblegum Setup

Use the provided scripts to allocate and configure a compressed NFT tree on devnet:

```bash
# From repository root
node simple-tree-setup.mjs                # quick demo tree
# or
node setup-full-merkle-tree.mjs           # full Bubblegum flow
```

Each script reads the default CLI keypair and stores addresses in `tree-addresses.json`. It also updates the frontend `.env.local`. Inspect generated JSON before rerunning scripts; they are not idempotent.

Manual alternative commands:

```bash
node create-new-tree.sh
node prepare-merkle-tree.mjs
node finalize-merkle-tree.mjs
```

Refer to `create-*` and `setup-*` scripts for variations (PDA trees, demo fallbacks, etc.).

## Running the Frontend

```bash
cd frontend
npm run dev        # start Next.js at http://localhost:3000
```

- Connect a Solana wallet (Phantom, Backpack, etc.) to devnet.
- Click **Sign in with GitHub** to authorize NextAuth.
- Run **Preflight** to confirm program, tree, and RPC configuration.
- Use **Mint Proof & cATT** to generate a demo Groth16 proof and call `verify_and_mint`.

For production builds:

```bash
cd frontend
npm run lint
npm run build
npm run start
```

## Deployment Checklist

1. Rebuild zk artifacts (optional) and update verifier constants.
2. `anchor build && anchor deploy` with the deployment keypair.
3. Copy refreshed IDL/type outputs into `frontend/lib/`.
4. Regenerate merkle tree addresses and sync environment variables.
5. `npm run build` in `frontend/` and deploy to Vercel or your infra.
6. Commit updated artifacts, IDL, and environment templates.

## Troubleshooting

- **Program not found**: Ensure `NEXT_PUBLIC_PROGRAM_ID` matches the deployed program and that it is on devnet.
- **Merkle tree missing**: Run `Run Preflight` in the UI; if it fails, re-run the tree setup script and confirm the tree authority.
- **Proof verification fails**: With the demo verifier, proof bytes must be non-empty. Once the real verifier is enabled, confirm the circuit inputs align with `zk-circuit/input.json`.
- **Anchor IDL mismatch**: If frontend transactions fail with instruction layout errors, rebuild the program and copy the generated IDL + TypeScript types.
- **RPC rate limits**: Provide a Helius API key or custom RPC endpoint via `NEXT_PUBLIC_HELIUS_API_KEY` and `NEXT_PUBLIC_RPC_URL` in `frontend/.env.local`.

## Repository Map

```
.
├── frontend/                # Next.js dApp
├── solana-program/          # Anchor program (Rust)
├── zk-circuit/              # Circom sources and tooling
├── zk-artifacts/            # Pre-built prover/verifier assets
├── create-*.mjs             # Bubblegum tree orchestration scripts
└── README.md                # You are here
```

## License

MIT. See individual directories for additional notices if applicable.
