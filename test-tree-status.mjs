import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com');

// Load keypairs
const payerKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('/Users/krewdev/.config/solana/id.json')))
);

const merkleTreeKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('merkle-tree-keypair.json')))
);

// Test if the tree can be used for minting
console.log('Testing tree account for Bubblegum compatibility...');
console.log('Tree:', merkleTreeKeypair.publicKey.toString());

try {
  // Get the account data
  const accountInfo = await connection.getAccountInfo(merkleTreeKeypair.publicKey);
  
  if (!accountInfo) {
    console.log('❌ Account does not exist');
    process.exit(1);
  }
  
  console.log('✅ Account exists');
  console.log('Owner:', accountInfo.owner.toString());
  console.log('Data length:', accountInfo.data.length);
  console.log('Space:', accountInfo.space);
  
  // Check if it's owned by Bubblegum
  const BUBBLEGUM_PROGRAM_ID = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY';
  if (accountInfo.owner.toString() === BUBBLEGUM_PROGRAM_ID) {
    console.log('✅ Owned by Bubblegum program');
    
    // Check if it's initialized (non-zero data)
    const isZero = accountInfo.data.every(byte => byte === 0);
    if (isZero) {
      console.log('❌ Account is not initialized (all zeros)');
      console.log('This tree needs to be initialized with a create_tree instruction');
    } else {
      console.log('✅ Account appears to be initialized');
      console.log('First 32 bytes:', accountInfo.data.slice(0, 32));
    }
  } else {
    console.log('❌ Not owned by Bubblegum program');
  }
  
  // Find the tree authority PDA
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [merkleTreeKeypair.publicKey.toBuffer()],
    new PublicKey(BUBBLEGUM_PROGRAM_ID)
  );
  
  console.log('Tree Authority PDA:', treeAuthority.toString());
  
  // Check if tree authority exists
  const treeAuthorityInfo = await connection.getAccountInfo(treeAuthority);
  if (treeAuthorityInfo) {
    console.log('✅ Tree Authority PDA exists');
  } else {
    console.log('❌ Tree Authority PDA does not exist');
  }
  
} catch (error) {
  console.error('Error:', error);
}