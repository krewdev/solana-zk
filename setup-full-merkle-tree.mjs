#!/usr/bin/env node

import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createAllocTreeIx, SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID } from '@solana/spl-account-compression';
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID, createCreateTreeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// Load payer keypair (your main wallet)
const payerKeypairPath = join(process.env.HOME, '.config', 'solana', 'id.json');
let payerKeypair;

try {
  const payerKeypairData = JSON.parse(fs.readFileSync(payerKeypairPath, 'utf8'));
  payerKeypair = Keypair.fromSecretKey(new Uint8Array(payerKeypairData));
  console.log('🔑 Loaded payer keypair:', payerKeypair.publicKey.toString());
} catch (error) {
  console.error('❌ Error loading payer keypair:', error.message);
  process.exit(1);
}

// Tree configuration - optimized for real NFT minting
const MAX_DEPTH = 14; // Can hold 2^14 = 16,384 NFTs
const MAX_BUFFER_SIZE = 64; // Number of changes that can be made in rapid succession
const CANOPY_DEPTH = 0; // For reduced proof size (costs more SOL)

async function setupMerkleTree() {
  console.log('🌳 Setting up REAL Merkle Tree for Compressed NFTs...');
  
  try {
    // Check balance
    const balance = await connection.getBalance(payerKeypair.publicKey);
    console.log(`💰 Current balance: ${balance / 1e9} SOL`);
    
    if (balance < 0.5 * 1e9) {
      console.log('❌ Insufficient balance. Need at least 0.5 SOL for tree creation');
      return;
    }

    // Generate tree keypair
    const treeKeypair = Keypair.generate();
    console.log('🌲 Generated tree keypair:', treeKeypair.publicKey.toString());

    // Calculate tree authority (PDA)
    const [treeAuthority] = PublicKey.findProgramAddressSync(
      [treeKeypair.publicKey.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );
    console.log('🏛️ Tree authority (PDA):', treeAuthority.toString());

    // Step 1: Create account allocation instruction
    const allocTreeIx = await createAllocTreeIx(
      connection,
      treeKeypair.publicKey,
      payerKeypair.publicKey,
      { maxDepth: MAX_DEPTH, maxBufferSize: MAX_BUFFER_SIZE },
      CANOPY_DEPTH
    );

    // Step 2: Create the tree instruction  
    const createTreeIx = createCreateTreeInstruction(
      {
        treeAuthority,
        merkleTree: treeKeypair.publicKey,
        payer: payerKeypair.publicKey,
        treeCreator: payerKeypair.publicKey,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      },
      {
        maxDepth: MAX_DEPTH,
        maxBufferSize: MAX_BUFFER_SIZE,
        public: false, // Set to true if you want a public tree
      }
    );

    // Create and send transaction
    const tx = new Transaction()
      .add(allocTreeIx)
      .add(createTreeIx);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payerKeypair.publicKey;

    // Sign transaction
    tx.sign(payerKeypair, treeKeypair);

    console.log('📡 Sending tree creation transaction...');
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('🔄 Confirming transaction...');
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    console.log('✅ Tree created successfully!');
    console.log('🔗 Transaction:', `https://solscan.io/tx/${signature}?cluster=devnet`);

    // Save configuration
    const config = {
      merkleTree: treeKeypair.publicKey.toString(),
      treeAuthority: treeAuthority.toString(),
      treeCreator: payerKeypair.publicKey.toString(),
      maxDepth: MAX_DEPTH,
      maxBufferSize: MAX_BUFFER_SIZE,
      canopyDepth: CANOPY_DEPTH,
      cluster: 'devnet',
      created: new Date().toISOString(),
      transactionSignature: signature,
      programIds: {
        bubblegum: BUBBLEGUM_PROGRAM_ID.toString(),
        compression: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toString(),
        logWrapper: SPL_NOOP_PROGRAM_ID.toString()
      },
      status: 'initialized',
      note: 'REAL initialized Merkle tree ready for compressed NFT minting'
    };

    // Save to file
    fs.writeFileSync('initialized-merkle-tree.json', JSON.stringify(config, null, 2));
    console.log('💾 Configuration saved to initialized-merkle-tree.json');

    // Update frontend environment
    const envPath = join(__dirname, 'frontend', '.env.local');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Update or add the environment variables
      const updates = {
        'NEXT_PUBLIC_MERKLE_TREE': treeKeypair.publicKey.toString(),
        'NEXT_PUBLIC_TREE_AUTHORITY': treeAuthority.toString(),
        'NEXT_PUBLIC_BUBBLEGUM_PROGRAM_ID': BUBBLEGUM_PROGRAM_ID.toString(),
        'NEXT_PUBLIC_COMPRESSION_PROGRAM_ID': SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toString(),
        'NEXT_PUBLIC_LOG_WRAPPER': SPL_NOOP_PROGRAM_ID.toString()
      };

      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }

      fs.writeFileSync(envPath, envContent);
      console.log('🔧 Updated frontend .env.local');
    }

    console.log('\n🎉 Merkle Tree Setup Complete!');
    console.log('📋 Tree Details:');
    console.log(`   🌲 Tree Address: ${treeKeypair.publicKey.toString()}`);
    console.log(`   🏛️  Tree Authority: ${treeAuthority.toString()}`);
    console.log(`   📊 Capacity: ${Math.pow(2, MAX_DEPTH)} NFTs`);
    console.log(`   🔗 Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    
    console.log('\n✅ Your tree is now INITIALIZED and ready for compressed NFT minting!');
    console.log('🚀 Test your application - NFTs will now mint for real and appear on Solscan!');

  } catch (error) {
    console.error('❌ Error setting up Merkle tree:', error);
    
    // Additional error details
    if (error.logs) {
      console.error('📋 Transaction logs:', error.logs);
    }
  }
}

// Run the setup
setupMerkleTree().catch(console.error);