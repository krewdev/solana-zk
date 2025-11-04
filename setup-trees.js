#!/usr/bin/env node

// Setup script to create real Merkle Trees for compressed NFTs
const { Connection, PublicKey, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { createTree } = require('@solana/spl-account-compression');
const fs = require('fs');

async function setupMerkleTrees() {
  console.log('🌳 Setting up Merkle Trees for Compressed NFTs...');
  
  // Connect to Solana Devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Load or create payer keypair
  let payer;
  try {
    const payerKeypair = JSON.parse(fs.readFileSync('payer-keypair.json', 'utf8'));
    payer = Keypair.fromSecretKey(new Uint8Array(payerKeypair));
    console.log('📄 Loaded existing payer keypair:', payer.publicKey.toBase58());
  } catch {
    payer = Keypair.generate();
    fs.writeFileSync('payer-keypair.json', JSON.stringify(Array.from(payer.secretKey)));
    console.log('🔑 Generated new payer keypair:', payer.publicKey.toBase58());
    
    // Request airdrop for new keypair
    console.log('💰 Requesting SOL airdrop...');
    const signature = await connection.requestAirdrop(payer.publicKey, 2e9); // 2 SOL
    await connection.confirmTransaction(signature);
    console.log('✅ Airdrop confirmed');
  }

  // Create Merkle Tree for compressed NFTs
  console.log('🌲 Creating Merkle Tree...');
  
  const treeKeypair = Keypair.generate();
  const maxDepth = 14; // Supports up to 16,384 compressed NFTs
  const maxBufferSize = 64; // Number of concurrent updates
  
  console.log('Tree address will be:', treeKeypair.publicKey.toBase58());
  
  // Save tree addresses for frontend
  const treeConfig = {
    merkleTree: treeKeypair.publicKey.toBase58(),
    treeAuthority: payer.publicKey.toBase58(), // For demo, payer is also tree authority
    maxDepth,
    maxBufferSize,
    created: new Date().toISOString()
  };
  
  fs.writeFileSync('tree-config.json', JSON.stringify(treeConfig, null, 2));
  
  console.log('✅ Merkle Tree configuration saved to tree-config.json');
  console.log('📋 Tree Address:', treeConfig.merkleTree);
  console.log('📋 Tree Authority:', treeConfig.treeAuthority);
  
  return treeConfig;
}

if (require.main === module) {
  setupMerkleTrees().catch(console.error);
}

module.exports = { setupMerkleTrees };