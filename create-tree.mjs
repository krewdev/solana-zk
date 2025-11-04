import { 
  Connection, 
  PublicKey, 
  Keypair, 
  clusterApiUrl, 
  SystemProgram,
  Transaction
} from '@solana/web3.js';
import { 
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  ValidDepthSizePair,
  createAllocTreeIx,
} from '@solana/spl-account-compression';
import { 
  MPL_BUBBLEGUM_PROGRAM_ID,
  createTreeV1,
} from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

async function createCompressedNFTTree() {
  console.log('🌳 Creating Compressed NFT Merkle Tree...');
  
  // Connect to Solana Devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Load keypair from Solana CLI config
  const keypairPath = '/Users/krewdev/.config/solana/id.json';
  const keypairFile = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairFile));
  
  console.log('🔑 Using keypair:', payer.publicKey.toBase58());
  
  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL');
  
  if (balance < 0.1e9) { // Less than 0.1 SOL
    console.log('💰 Requesting airdrop...');
    const signature = await connection.requestAirdrop(payer.publicKey, 1e9);
    await connection.confirmTransaction(signature);
    console.log('✅ Airdrop confirmed');
  }
  
  // Generate tree keypair
  const treeKeypair = Keypair.generate();
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [treeKeypair.publicKey.toBuffer()],
    MPL_BUBBLEGUM_PROGRAM_ID,
  );
  
  console.log('🌲 Tree Address:', treeKeypair.publicKey.toBase58());
  console.log('🏛️ Tree Authority:', treeAuthority.toBase58());
  
  // Tree configuration
  const maxDepthSizePair = {
    maxDepth: 14, // Supports 16,384 compressed NFTs
    maxBufferSize: 64, // Concurrent changes
  };
  
  const canopyDepth = 0; // No canopy for simplicity
  
  // Create instructions
  const allocTreeInstruction = await createAllocTreeIx(
    connection,
    treeKeypair.publicKey,
    payer.publicKey,
    maxDepthSizePair,
    canopyDepth,
  );
  
  const createTreeInstruction = createCreateTreeInstruction(
    {
      treeAuthority,
      merkleTree: treeKeypair.publicKey,
      payer: payer.publicKey,
      treeCreator: payer.publicKey,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
    },
    {
      maxBufferSize: maxDepthSizePair.maxBufferSize,
      maxDepth: maxDepthSizePair.maxDepth,
      public: false, // Private tree
    },
  );
  
  // Create and send transaction
  const transaction = new Transaction()
    .add(allocTreeInstruction)
    .add(createTreeInstruction);
  
  transaction.feePayer = payer.publicKey;
  
  console.log('📤 Sending transaction...');
  const signature = await connection.sendTransaction(transaction, [payer, treeKeypair], {
    commitment: 'confirmed',
  });
  
  console.log('⏳ Confirming transaction...');
  await connection.confirmTransaction(signature, 'confirmed');
  
  console.log('✅ Merkle Tree created successfully!');
  console.log('🔗 Transaction:', `https://solscan.io/tx/${signature}?cluster=devnet`);
  
  // Save configuration
  const config = {
    merkleTree: treeKeypair.publicKey.toBase58(),
    treeAuthority: treeAuthority.toBase58(),
    treeCreator: payer.publicKey.toBase58(),
    maxDepth: maxDepthSizePair.maxDepth,
    maxBufferSize: maxDepthSizePair.maxBufferSize,
    canopyDepth,
    transaction: signature,
    created: new Date().toISOString(),
    cluster: 'devnet'
  };
  
  fs.writeFileSync('compressed-nft-tree.json', JSON.stringify(config, null, 2));
  console.log('💾 Configuration saved to compressed-nft-tree.json');
  
  // Update .env.local
  const envPath = '/Users/krewdev/hackathon2025/frontend/.env.local';
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  envContent = envContent.replace(
    /NEXT_PUBLIC_MERKLE_TREE=.*/,
    `NEXT_PUBLIC_MERKLE_TREE=${treeKeypair.publicKey.toBase58()}`
  );
  envContent = envContent.replace(
    /NEXT_PUBLIC_TREE_AUTHORITY=.*/,
    `NEXT_PUBLIC_TREE_AUTHORITY=${treeAuthority.toBase58()}`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('🔧 Updated frontend .env.local with real tree addresses');
  
  return config;
}

createCompressedNFTTree().catch(console.error);