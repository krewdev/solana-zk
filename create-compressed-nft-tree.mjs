import { 
  Connection, 
  PublicKey, 
  Keypair, 
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  createAllocTreeIx,
  ValidDepthSizePair,
} from '@solana/spl-account-compression';
import { 
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createCreateTreeInstruction,
} from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

async function createCompressedNFTTree() {
  console.log('🌳 Creating Compressed NFT Tree for Aletheia Protocol...');
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Load payer keypair
  const keypairPath = '/Users/krewdev/.config/solana/id.json';
  const keypairFile = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairFile));
  
  console.log('🔑 Payer:', payer.publicKey.toBase58());
  
  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL`);
  
  if (balance < 0.1 * 1e9) {
    console.log('❌ Insufficient balance. Need at least 0.1 SOL for tree creation');
    return;
  }
  
  // Generate tree keypair
  const treeKeypair = Keypair.generate();
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [treeKeypair.publicKey.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
  
  console.log('🌲 Tree Address:', treeKeypair.publicKey.toBase58());
  console.log('🏛️ Tree Authority:', treeAuthority.toBase58());
  
  // Tree configuration
  const maxDepthSizePair = {
    maxDepth: 14,
    maxBufferSize: 64,
  };
  const canopyDepth = 0;
  
  console.log('📏 Tree Config:', maxDepthSizePair);
  
  try {
    // Create transaction with tree creation instructions
    const transaction = new Transaction();
    
    // 1. Allocate tree account
    const allocTreeIx = await createAllocTreeIx(
      connection,
      treeKeypair.publicKey,
      payer.publicKey,
      maxDepthSizePair,
      canopyDepth
    );
    
    // 2. Create tree instruction
    const createTreeIx = createCreateTreeInstruction(
      {
        treeAuthority,
        merkleTree: treeKeypair.publicKey,
        payer: payer.publicKey,
        treeCreator: payer.publicKey,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      },
      {
        maxBufferSize: maxDepthSizePair.maxBufferSize,
        maxDepth: maxDepthSizePair.maxDepth,
        public: false, // Private tree
      }
    );
    
    transaction.add(allocTreeIx, createTreeIx);
    
    console.log('📝 Sending tree creation transaction...');
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, treeKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Tree created successfully!');
    console.log('🔗 Transaction:', `https://solscan.io/tx/${signature}?cluster=devnet`);
    
    // Save tree configuration
    const config = {
      merkleTree: treeKeypair.publicKey.toBase58(),
      treeAuthority: treeAuthority.toBase58(),
      treeCreator: payer.publicKey.toBase58(),
      maxDepth: maxDepthSizePair.maxDepth,
      maxBufferSize: maxDepthSizePair.maxBufferSize,
      canopyDepth,
      cluster: 'devnet',
      transactionSignature: signature,
      created: new Date().toISOString(),
      programIds: {
        bubblegum: BUBBLEGUM_PROGRAM_ID.toBase58(),
        compression: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toBase58(),
        logWrapper: SPL_NOOP_PROGRAM_ID.toBase58(),
      }
    };
    
    fs.writeFileSync('compressed-nft-tree.json', JSON.stringify(config, null, 2));
    console.log('💾 Tree configuration saved to compressed-nft-tree.json');
    
    // Update frontend environment
    const envPath = '/Users/krewdev/hackathon2025/frontend/.env.local';
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Update or add tree addresses
      const updates = {
        'NEXT_PUBLIC_MERKLE_TREE': config.merkleTree,
        'NEXT_PUBLIC_TREE_AUTHORITY': config.treeAuthority,
        'NEXT_PUBLIC_BUBBLEGUM_PROGRAM_ID': BUBBLEGUM_PROGRAM_ID.toBase58(),
        'NEXT_PUBLIC_COMPRESSION_PROGRAM_ID': SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toBase58(),
        'NEXT_PUBLIC_LOG_WRAPPER': SPL_NOOP_PROGRAM_ID.toBase58(),
      };
      
      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (envContent.match(regex)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('🔧 Updated frontend .env.local with tree addresses');
    }
    
    console.log('\n🎉 Compressed NFT Tree Setup Complete!');
    console.log('📋 Summary:');
    console.log(`   Tree Address: ${config.merkleTree}`);
    console.log(`   Tree Authority: ${config.treeAuthority}`);
    console.log(`   Max Items: ${Math.pow(2, maxDepthSizePair.maxDepth)}`);
    console.log('');
    console.log('✅ Your Aletheia Protocol can now mint compressed NFTs!');
    
    return config;
    
  } catch (error) {
    console.error('❌ Error creating tree:', error);
    throw error;
  }
}

createCompressedNFTTree().catch(console.error);