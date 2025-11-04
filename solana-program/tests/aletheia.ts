import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const idlPath = path.resolve(__dirname, "../../frontend/lib/aletheia_protocol.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8")) as anchor.Idl;
  const programId = new anchor.web3.PublicKey((idl as any).address);
  const program = new anchor.Program(idl, programId, provider);

  const mockProofData = Buffer.alloc(256, 1);
  const mockPublicInputs = Buffer.alloc(32, 0);
  mockPublicInputs[31] = 5;

  const txSig = await program.methods
    .verifyProofOnly(mockProofData, mockPublicInputs)
    .accounts({
      payer: provider.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("verify_proof_only tx:", txSig);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});