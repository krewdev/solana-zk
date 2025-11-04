import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

(async () => {
  const rpcUrl =
    process.env.ANCHOR_PROVIDER_URL ??
    process.env.NEXT_PUBLIC_RPC_URL ??
    "https://api.devnet.solana.com";

  const connection = new anchor.web3.Connection(rpcUrl, "confirmed");
  const walletPath =
    process.env.ANCHOR_WALLET ||
    `${process.env.HOME ?? process.env.USERPROFILE}/.config/solana/id.json`;

  if (!walletPath || !fs.existsSync(walletPath)) {
    throw new Error(
      `Anchor wallet not found. Set ANCHOR_WALLET or ensure ${walletPath} exists.`
    );
  }

  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions()
  );

  anchor.setProvider(provider);
  const payer = provider.wallet.publicKey;
  if (!payer) {
    throw new Error("Provider wallet public key is not available");
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const idlPath = path.resolve(__dirname, "../../frontend/lib/aletheia_protocol.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8")) as anchor.Idl;
  const programId = new PublicKey((idl as any).address);
  const program = new anchor.Program(idl, programId, provider);

  const treeConfigPath = path.resolve(__dirname, "../../compressed-nft-tree.json");
  const treeConfig = JSON.parse(fs.readFileSync(treeConfigPath, "utf-8"));

  const merkleTree = new PublicKey(treeConfig.merkleTree);
  const bubblegumProgram = new PublicKey(treeConfig.programIds.bubblegum);
  const compressionProgram = new PublicKey(treeConfig.programIds.compression);
  const logWrapper = new PublicKey(treeConfig.programIds.logWrapper);

  const [derivedTreeAuthority] = PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    bubblegumProgram
  );

  const expectedTreeAuthority = new PublicKey(treeConfig.treeAuthority);
  if (!derivedTreeAuthority.equals(expectedTreeAuthority)) {
    throw new Error(
      `Tree authority mismatch. Derived ${derivedTreeAuthority.toBase58()} vs config ${expectedTreeAuthority.toBase58()}`
    );
  }

  const proofBytes = Buffer.alloc(256, 1);
  const publicInputBytes = Buffer.from(JSON.stringify([1]));

  console.log("Attempting verify_and_mint against devnet tree", {
    programId: program.programId.toBase58(),
    merkleTree: merkleTree.toBase58(),
    treeAuthority: derivedTreeAuthority.toBase58(),
    payer: payer.toBase58(),
  });

  try {
    const signature = await program.methods
      .verifyAndMint(proofBytes, publicInputBytes)
      .accounts({
        payer,
        merkleTree,
        treeAuthority: derivedTreeAuthority,
        logWrapper,
        compressionProgram,
        bubblegumProgram,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Mint transaction signature:", signature);
  } catch (error: any) {
    console.error("verify_and_mint failed", {
      message: error?.message,
      logs: error?.logs || error?.transactionLogs,
      signature: error?.signature,
    });
    throw error;
  }
})();
