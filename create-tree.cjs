#!/usr/bin/env node

// Simple script to generate mock Merkle Tree addresses for development
const crypto = require('crypto');
const fs = require('fs');

function generateMockPubkey() {
  // Generate a realistic-looking Solana pubkey
  const bytes = crypto.randomBytes(32);
  const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += base58chars[Math.floor(Math.random() * base58chars.length)];
  }
  return result;
}

async function createMockTreeAddresses() {
  try {
    console.log('🌳 Generating mock Merkle Tree addresses for development...');
    
    const addresses = {
      merkleTree: generateMockPubkey(),
      treeAuthority: generateMockPubkey(),
      programId: "69NQbWEHJE29u2qco87rWMEm2kjJJKhNEvdG8fg8zfTa",
      note: "MOCK ADDRESSES - For hackathon development only. Replace with real Merkle Tree addresses later.",
      createdAt: new Date().toISOString()
    };
    
    // Save to file
    fs.writeFileSync('/Users/krewdev/hackathon2025/tree-addresses.json', JSON.stringify(addresses, null, 2));
    
    console.log('✅ Mock tree addresses generated:');
    console.log('Merkle Tree:', addresses.merkleTree);
    console.log('Tree Authority:', addresses.treeAuthority);
    console.log('Program ID:', addresses.programId);
    console.log('📄 Saved to tree-addresses.json');
    
    return addresses;
    
  } catch (error) {
    console.error('Error generating addresses:', error);
    throw error;
  }
}

// Run the script
createMockTreeAddresses().then(addresses => {
  console.log('\n🚀 Next steps:');
  console.log('1. Update frontend with these addresses');
  console.log('2. Test the minting flow with mock data');
  console.log('3. For production, create real Merkle Tree with proper Metaplex tools');
}).catch(console.error);