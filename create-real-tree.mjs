import {
  Connection, 
  PublicKey, 
  Keypair, 
  clusterApiUrl,
  Transaction, 
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  createAllocTreeIx,
  ValidDepthSizePair,
} = require('@solana/spl-account-compression');
import {
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createCreateTreeInstruction,
} from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

async function createRealMerkleTree() {
  console.log('🌳 Creating REAL Merkle Tree for Compressed NFTs...');
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Load your wallet
  const keypairPath = '/Users/krewdev/.config/solana/id.json';
  const keypairFile = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairFile));
  
  console.log('🔑 Payer:', payer.publicKey.toBase58());
  
  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('❌ Insufficient balance for tree creation. Need at least 0.1 SOL');
    console.log('💡 Use: solana airdrop 1');
    return;
  }
  
  // Generate new keypair for the tree
  const treeKeypair = Keypair.generate();
  console.log('🌲 Tree Keypair:', treeKeypair.publicKey.toBase58());
  
  // Calculate tree authority PDA
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [treeKeypair.publicKey.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
  console.log('🏛️ Tree Authority:', treeAuthority.toBase58());
  
  // Tree configuration for compressed NFTs
  const maxDepthSizePair = {
    maxDepth: 14,       // Can hold 2^14 = 16,384 NFTs
    maxBufferSize: 64,  // Buffer for concurrent operations
  };
  const canopyDepth = 0; // No canopy for simplicity
  
  console.log('📊 Tree Config:');
  console.log(`   Max Depth: ${maxDepthSizePair.maxDepth}`);
  console.log(`   Max Buffer: ${maxDepthSizePair.maxBufferSize}`);
  console.log(`   Max NFTs: ${Math.pow(2, maxDepthSizePair.maxDepth)}`);
  
  try {
    console.log('🔨 Creating tree transaction...');
    
    const transaction = new Transaction();
    
    // Step 1: Allocate space for the tree account
    const allocTreeInstruction = await createAllocTreeIx(
      connection,
      treeKeypair.publicKey,
      payer.publicKey,
      maxDepthSizePair,
      canopyDepth
    );
    
    // Step 2: Initialize the tree
    const createTreeInstruction = createCreateTreeInstruction(
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
        public: false, // Private tree (you control it)
      }
    );
    
    transaction.add(allocTreeInstruction);
    transaction.add(createTreeInstruction);
    
    console.log('📤 Sending transaction to Solana...');
    
    // Send and confirm the transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, treeKeypair],
      {
        commitment: 'confirmed',
        skipPreflight: false,
      }
    );
    
    console.log('✅ Tree created successfully!');
    console.log('🔗 Transaction:', `https://solscan.io/tx/${signature}?cluster=devnet`);
    
    // Save the tree configuration
    const treeConfig = {
      merkleTree: treeKeypair.publicKey.toBase58(),
      treeAuthority: treeAuthority.toBase58(),
      treeCreator: payer.publicKey.toBase58(),
      maxDepth: maxDepthSizePair.maxDepth,
      maxBufferSize: maxDepthSizePair.maxBufferSize,
      canopyDepth: canopyDepth,
      transactionSignature: signature,
      cluster: 'devnet',
      created: new Date().toISOString(),
      programIds: {
        bubblegum: BUBBLEGUM_PROGRAM_ID.toBase58(),
        compression: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toBase58(),
        logWrapper: SPL_NOOP_PROGRAM_ID.toBase58(),
      },
      treeKeypair: Array.from(treeKeypair.secretKey), // Save keypair for potential use
    };
    
    // Save to file
    fs.writeFileSync('real-compressed-nft-tree.json', JSON.stringify(treeConfig, null, 2));
    console.log('💾 Tree config saved to real-compressed-nft-tree.json');
    
    // Update frontend environment variables
    const envPath = '/Users/krewdev/hackathon2025/frontend/.env.local';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update tree addresses
    envContent = envContent.replace(
      /NEXT_PUBLIC_MERKLE_TREE=.*/,
      `NEXT_PUBLIC_MERKLE_TREE=${treeConfig.merkleTree}`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_TREE_AUTHORITY=.*/,
      `NEXT_PUBLIC_TREE_AUTHORITY=${treeConfig.treeAuthority}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('🔧 Updated frontend .env.local');
    
    console.log('\n🎉 SUCCESS! Real Merkle Tree Created!');
    console.log('📋 Tree Details:');
    console.log(`   🌲 Tree Address: ${treeConfig.merkleTree}`);
    console.log(`   🏛️  Authority: ${treeConfig.treeAuthority}`);
    console.log(`   📊 Capacity: ${Math.pow(2, maxDepthSizePair.maxDepth)} NFTs`);
    console.log(`   🔗 Creation Tx: https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log('\n✅ Your Aletheia Protocol can now mint REAL compressed NFTs!');
    console.log('🎯 Try minting through your frontend - NFTs will appear on Solscan!');
    
    return treeConfig;
    
  } catch (error) {
    console.error('❌ Error creating tree:', error);
    
    if (error.message?.includes('insufficient funds')) {
      console.log('💡 Solution: Get more SOL with: solana airdrop 1');
    } else if (error.message?.includes('blockhash')) {
      console.log('💡 Solution: Network congestion, try again');
    } else {
      console.log('💡 Check Solana RPC connection and try again');
    }
    
    throw error;
  }
}

createRealMerkleTree().catch(console.error);