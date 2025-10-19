pragma circom 2.0.0;

// Minimal demo circuit: exposes the prover's private input as an output.
// This is intentionally simple to ensure reliable compilation for the hackathon demo.
template RepoChecker() {
    // Prover's private input
    signal input publicRepos;

    // For the demo, just mirror the input to an output.
    signal output out;
    out <== publicRepos;
}

component main = RepoChecker();