# zk-circuit

This folder contains a small Circom circuit and a Node.js script that compiles the circuit, runs a simple trusted setup, generates a proof with `snarkjs`, and verifies it.

The fastest way to ship your hackathon demo is to precompile the circuit and include the generated artifacts in the repo. That way users don't need `circom` or Docker at runtime.

Shipping options (pick one):

1) Precompile artifacts (recommended for hackathons)
- On your machine (or CI), compile the circuit and commit the outputs:

  ```bash
  # from zk-circuit/ directory
  # Option A: Docker (if you can pull ghcr.io/iden3/circom:2.0.0)
  docker run --rm -v "$(pwd)":/src -w /src ghcr.io/iden3/circom:2.0.0 \
    circom circuit.circom --r1cs --wasm --sym --c

  # Option B: native binary (downloaded from https://github.com/iden3/circom/releases)
  circom circuit.circom --r1cs --wasm --sym --c
  ```

- Commit the following files/dirs to your repo:
  - `circuit.r1cs`
  - `circuit_js/` directory (contains `circuit.wasm` and `generate_witness.js`)

- On the demo machine, users can simply run:
  ```bash
  cd zk-circuit
  npm install
  npm start
  ```

2) Use Docker at runtime
- Ensure Docker is installed and you can pull the GHCR image (may require `docker login ghcr.io` with a PAT that has `read:packages`):
  ```bash
  # login if needed
  echo "$GHCR_PAT" | docker login ghcr.io -u "$GHUSER" --password-stdin

  # then build the circuit
  npm run build:circuit:docker
  ```

3) Use native circom on the machine
- Install the circom v2 binary and ensure `circom` is on PATH (see releases linked above). Then run:
  ```bash
  npm run build:circuit:native
  ```

Notes
- `run_proof.mjs` automatically skips compilation if `circuit.r1cs` and `circuit_js/circuit.wasm` are present. That makes precompiled shipping the simplest option for demos.
- If you run into `npx circom` parser errors, it is usually because the npm `circom` package is not the v2 compiler — prefer Docker or native binary.

If you want, I can precompile the artifacts in CI and add them to your repo (or produce a small script to do that). Tell me which option you'd like me to take and I'll proceed.

CI compilation
--------------

This repository includes a GitHub Actions workflow `Compile Circom and Commit Artifacts` (accessible from the Actions tab or via `workflow_dispatch`) that will attempt to download a circom v2 binary, compile `zk-circuit/circuit.circom`, and commit the resulting `circuit.r1cs` and `circuit_js/` artifacts back to the repo.

How to run it:
1. Open the repository on GitHub.
2. Go to the Actions tab, select `Compile Circom and Commit Artifacts` and click `Run workflow`.
3. The workflow will run and, on success, push compiled artifacts into the `zk-circuit/` directory.

Note: if the workflow fails to download the circom binary, update the `CIRCOM_TAG` or the download URLs in `.github/workflows/compile-and-commit.yml`.