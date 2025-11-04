# Copilot Instructions

## Project Overview
- Repository delivers the **Aletheia Protocol**: an Anchor Solana program ("aletheia_protocol"), a Next.js frontend, and Circom/SNARK tooling to attest GitHub activity via compressed NFTs.
- Key dirs: `solana-program/` (on-chain logic), `frontend/` (Next 14 app + NextAuth + Solana wallets), `zk-circuit/` & `zk-artifacts/` (Circom source, prover assets), root `*.mjs`/`*.sh` scripts (Merkle tree + setup helpers).
- Devnet is the default cluster; program ID `mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6` is referenced across Anchor, frontend env, and IDL files.

## Solana Program
- Main entrypoint `solana-program/src/lib.rs` exposes `verify_and_mint` (Groth16 verify + Bubblegum mint) and `verify_proof_only` (verification fallback). Accounts must align with Metaplex Bubblegum CPI.
- ZK verification currently shortcuts: `verifier::verify_proof` accepts any non-empty payload during demos. Re-enable the commented Groth16 path when real proofs are available.
- Verification key constants in `solana-program/src/verifier.rs` come from `zk-artifacts/verification_key.json`; regenerate and re-paste when the circuit changes.
- Build with `anchor build`; artifacts land in `solana-program/target/idl/` and `target/types/`. Tests run via `anchor test` (wraps `ts-mocha`, see `Anchor.toml`).

## Frontend
- Next.js app in `frontend/` uses `@coral-xyz/anchor` to hit the program. Entry in `pages/index.tsx` handles wallet auth, GitHub OAuth, proof generation, and transaction submission, with a fallback flow that logs success when minting fails.
- `frontend/pages/api/auth/[...nextauth].ts` wires GitHub OAuth; session tokens stash the full GitHub profile so `/api/github-profile` can operate without extra API calls.
- Wallet connectivity is provided by `WalletConnectionProvider.tsx` (auto-connect, devnet endpoint with optional `NEXT_PUBLIC_RPC_URL`).
- Program IDL/types live in `frontend/lib/aletheia_protocol.{json,ts}`; keep these synced with Anchor outputs after rebuilding.
- Public ZK assets (`circuit.wasm`, `circuit_final.zkey`) are served from `frontend/public/zk/` and consumed by snarkjs in the mint flow.

## ZK Tooling
- Source circuit, trusted setup scripts, and proof automation reside in `zk-circuit/`. `run_proof.mjs` orchestrates compilation, Powers of Tau, key generation, proof creation, and verification with fallbacks for missing binaries.
- Precompiled artifacts are committed under `zk-artifacts/`; these back both the on-chain verifier (via hardcoded key) and the frontend (`public/zk/`). Update both locations together when circuits change.
- GitHub Action `.github/workflows/compile-and-commit.yml` can be manually triggered to rebuild Circom artifacts and push them back to the repo.

## Merkle Tree & Dev Scripts
- Root scripts like `setup-real-cnft.mjs`, `setup-compressed-nft-demo.mjs`, and `simple-tree-setup.mjs` manage Bubblegum tree config, using the signer at `~/.config/solana/id.json`. They persist results in `compressed-nft-tree.json` and patch `frontend/.env.local`.
- `create-new-tree.sh` wraps `solana` CLI commands to allocate a tree account and records addresses in `tree-addresses.json`.
- Expect these utilities to mutate env files and require Solana CLI + devnet SOL; do not assume idempotency without checking generated JSON first.

## Developer Workflow
- Environment vars needed: frontend `.env.local` should define `NEXT_PUBLIC_PROGRAM_ID`, tree addresses, Bubblegum/Compression program IDs, Helius key, plus NextAuth secrets (`GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`).
- Typical flow: `anchor build && anchor deploy` (if redeploying), copy refreshed IDL/Type files into `frontend/lib/`, run setup script to sync Merkle tree env, then `cd frontend && npm install && npm run dev`.
- When modifying circuits: run `node zk-circuit/run_proof.mjs`, update `zk-artifacts/*`, refresh verifier constants, redeploy program, copy new frontend assets.
- Integration tests: `anchor test` hits mocked proofs; remember that real proof bytes must satisfy the size checks once the verifier is reinstated.

## Gotchas
- Frontend mint path requires both wallet + GitHub session; ensure `signIn('github')` is exposed when adding new pages/components.
- Bubblegum tree authority is derived; ensure `NEXT_PUBLIC_TREE_AUTHORITY` matches the PDA computed from `MERKLE_TREE` or transactions will fail preflight (debug panel in `index.tsx` helps diagnose).
- `verify_and_mint` CPI stack is sensitive to account order—mirror `MintV1CpiBuilder` usage when adding new flows or writing tests.
