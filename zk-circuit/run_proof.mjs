// run_proof.mjs

import { exec } from 'child_process';
import { promisify } from 'util';
import * as snarkjs from 'snarkjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

async function main() {
    console.log("Starting ZK proof generation and verification process...");

    // Ensure relative paths resolve correctly regardless of where node was invoked from
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    process.chdir(__dirname);

    // helper to run shell commands with clearer errors
    async function run(cmd, opts = {}) {
        console.log(`> ${cmd}`);
        try {
            const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10, ...opts });
            if (stdout) process.stdout.write(stdout);
            if (stderr) process.stderr.write(stderr);
            return { stdout, stderr };
        } catch (e) {
            // include command in thrown error for easier debugging
            const err = new Error(`Command failed: ${cmd}\n${e.stderr || e.message}`);
            err.original = e;
            throw err;
        }
    }

    // 1. Compile the Circuit
    console.log("Compiling circuit.circom (skipping if artifacts already exist)...");
    // If the circuit was already compiled (pre-shipped), skip compilation to make shipping easy.
    const compiledExists = fs.existsSync('circuit.r1cs') && fs.existsSync(path.join('circuit_js', 'circuit.wasm'));
    if (compiledExists) {
        console.log('Found existing compiled artifacts (circuit.r1cs and circuit_js/circuit.wasm) — skipping compilation.');
    } else {
        // Prefer a local binary if present (e.g., ./circom built in this repo), otherwise try npx.
        try {
            if (fs.existsSync(path.join(__dirname, 'circom'))) {
                console.log('Found local ./circom binary — using that to compile the circuit.');
                await run(`"${path.join(__dirname, 'circom')}" circuit.circom --r1cs --wasm --sym --c`);
            } else {
                await run('npx --yes circom circuit.circom --r1cs --wasm --sym --c');
            }
        } catch (err) {
            console.warn('npx circom failed. This often means the npm "circom" package is an older/incompatible version.');
            // Try Docker fallback (uses the circom v2 image). This requires Docker to be installed and logged-in to GHCR.
            try {
                await run('docker --version');
                console.log('Attempting to run circom in Docker (ghcr.io/iden3/circom:2.0.0)...');
                // mount current directory into /src in the container and run circom there
                await run(`docker run --rm -v "${process.cwd()}:/src" -w /src ghcr.io/iden3/circom:2.0.0 circom circuit.circom --r1cs --wasm --sym --c`);
            } catch (dockerErr) {
                console.error('\nNeither a compatible circom binary nor Docker fallback is available.');
                console.error('Options:');
                console.error('  1) Install circom v2 (see https://github.com/iden3/circom/releases) and ensure `circom` is on your PATH.');
                console.error('  2) Login to GitHub Container Registry and allow pulling ghcr.io/iden3/circom:2.0.0, or install Docker Desktop and run the container.');
                console.error('     Example docker command:');
                console.error('       docker run --rm -v "$(pwd)":/src -w /src ghcr.io/iden3/circom:2.0.0 circom circuit.circom --r1cs --wasm --sym --c');
                throw err;
            }
        }
    }
    console.log("Circuit compiled successfully.");

    // 2. Start the Trusted Setup (Powers of Tau)
    // This is a generic setup phase. For a real app, you'd use a larger, more secure one.
    console.log("\nStarting Powers of Tau setup...");
    if (!fs.existsSync("pot12_final.ptau")) {
        // Try wget/curl via shell; if not present (common in minimal containers), fallback to Node fetch.
        const url = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau';
        try {
            await run(`wget ${url} -O pot12_final.ptau || curl -L ${url} -o pot12_final.ptau`);
        } catch (err) {
            console.log('Shell download failed (wget/curl not available). Falling back to Node fetch to download the ptau file...');
            try {
                // Use global fetch (Node 18+) to download the file
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Failed to download ptau via fetch: ${res.status} ${res.statusText}`);
                const fileStream = fs.createWriteStream('pot12_final.ptau');
                await new Promise((resolve, reject) => {
                    res.body.pipe(fileStream);
                    res.body.on('error', reject);
                    fileStream.on('finish', resolve);
                });
                console.log('Downloaded pot12_final.ptau via Node fetch.');
                // Validate the downloaded file (it should be reasonably large). If it's too small
                // it's likely an HTML error page or redirect.
                try {
                    const stat = fs.statSync('pot12_final.ptau');
                    if (stat.size < 1024 * 1024) { // less than 1MB
                        console.warn('Downloaded ptau appears too small (likely not a valid ptau). Will generate locally via snarkjs.');
                        fs.unlinkSync('pot12_final.ptau');
                        throw new Error('ptau-too-small');
                    }
                } catch (e) {
                    if (e.message === 'ptau-too-small') throw e; else console.warn('ptau stat check failed, will attempt snarkjs fallback');
                }
            } catch (fetchErr) {
                console.warn(`Fetch failed: ${fetchErr.message}`);
                console.log('Falling back to local Powers of Tau generation using snarkjs (this is slower but self-contained)...');
                // Create a small local powers of tau using snarkjs so we don't need the downloaded ptau
                await run('npx --yes snarkjs powersoftau new bn128 12 pot12_0000.ptau');
                await run('npx --yes snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="Aletheia Contributor" -v');
                await run('npx --yes snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau');
                console.log('Generated local pot12_final.ptau via snarkjs.');
            }
        }
    }
    console.log("Powers of Tau setup complete.");

    // 3. Generate Proving Key and Verification Key
    console.log("\nGenerating proving and verification keys...");
    await run('npx --yes snarkjs groth16 setup circuit.r1cs pot12_final.ptau circuit_0000.zkey');
    await run('npx --yes snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="Aletheia Contributor" -v');
    await run('npx --yes snarkjs zkey export verificationkey circuit_final.zkey verification_key.json');
    console.log("Keys generated successfully.");

    // --- PROOF GENERATION ---
    console.log("\n--- Starting Proof Generation ---");
    // This is the input from our user (e.g., fetched from GitHub API)
    const userInput = { publicRepos: 5 }; // We are simulating a user with 5 repos.
    console.log(`Simulating user with input: ${JSON.stringify(userInput)}`);

    // write input.json before generating the witness (was previously reversed)
    fs.writeFileSync("input.json", JSON.stringify(userInput));
    await run(`node circuit_js/generate_witness.js circuit_js/circuit.wasm input.json witness.wtns`, {
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    });

    // Generate the proof
    const { proof, publicSignals } = await snarkjs.groth16.prove('circuit_final.zkey', 'witness.wtns');
    console.log("Proof generated:");
    console.log(JSON.stringify(proof, null, 1));
    fs.writeFileSync('proof.json', JSON.stringify(proof, null, 1));
    fs.writeFileSync('public.json', JSON.stringify(publicSignals, null, 1));

    // --- PROOF VERIFICATION ---
    console.log("\n--- Starting Proof Verification ---");
    const vKey = JSON.parse(fs.readFileSync("verification_key.json"));
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    console.log(`\nProof is valid: ${isValid}`);
    console.log("-------------------------------------");

    if (isValid) {
        console.log("✅ Success! You have a working end-to-end ZK circuit.");
    } else {
        console.log("❌ Failure. The proof did not verify. Check your circuit logic and inputs.");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});