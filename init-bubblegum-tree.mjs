import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com');

// Load keypairs
const payerKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('/Users/krewdev/.config/solana/id.json')))
);

const merkleTreeKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('merkle-tree-keypair.json')))
);

// Constants
const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');

// Tree configuration
const maxDepth = 14; // 2^14 = 16,384 leaves
const maxBufferSize = 64; // Concurrent transactions

// Find the tree authority PDA
const [treeAuthority] = PublicKey.findProgramAddressSync(
  [merkleTreeKeypair.publicKey.toBuffer()],
  BUBBLEGUM_PROGRAM_ID
);

console.log('Initializing Bubblegum tree...');
console.log('Tree:', merkleTreeKeypair.publicKey.toString());
console.log('Tree Authority:', treeAuthority.toString());
console.log('Payer:', payerKeypair.publicKey.toString());

try {
  // Create the instruction data for tree creation
  const instructionData = Buffer.concat([
    Buffer.from([0]), // CreateTree instruction discriminator
    Buffer.from([maxDepth]), // Max depth
    Buffer.from([maxBufferSize]), // Max buffer size
  ]);

  // Create the instruction to initialize the tree
  const createTreeIx = new TransactionInstruction({
    keys: [
      { pubkey: merkleTreeKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: treeAuthority, isSigner: false, isWritable: true },
      { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: false }, // tree creator
      { pubkey: new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'), isSigner: false, isWritable: false }, // log wrapper
      { pubkey: new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'), isSigner: false, isWritable: false }, // compression program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BUBBLEGUM_PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(createTreeIx);
  
  // Sign with both payer and tree keypair
  const signature = await connection.sendTransaction(transaction, [payerKeypair, merkleTreeKeypair]);
  
  console.log('Tree initialization transaction:', signature);
  
  // Wait for confirmation
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  
  if (confirmation.value.err) {
    console.error('Transaction failed:', confirmation.value.err);
  } else {
    console.log('✅ Bubblegum tree initialized successfully!');
    
    // Save the configuration
    const config = {
      merkleTree: merkleTreeKeypair.publicKey.toString(),
      treeAuthority: treeAuthority.toString(),
      maxDepth,
      maxBufferSize,
      signature
    };
    
    fs.writeFileSync('bubblegum-tree-config.json', JSON.stringify(config, null, 2));
    console.log('Configuration saved to bubblegum-tree-config.json');
  }
  
} catch (error) {
  console.error('Error initializing tree:', error);
}