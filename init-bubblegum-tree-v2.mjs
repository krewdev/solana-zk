import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { createCreateTreeInstruction, PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum';
import { SPL_NOOP_PROGRAM_ID, SPL_ACCOUNT_COMPRESSION_PROGRAM_ID } from '@solana/spl-account-compression';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com');

// Load keypairs
const payerKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('/Users/krewdev/.config/solana/id.json')))
);

const merkleTreeKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('merkle-tree-keypair.json')))
);

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
  // Create the instruction to initialize the tree
  const createTreeIx = createCreateTreeInstruction(
    {
      merkleTree: merkleTreeKeypair.publicKey,
      treeAuthority: treeAuthority,
      treeCreator: payerKeypair.publicKey,
      payer: payerKeypair.publicKey,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
    {
      maxDepth,
      maxBufferSize,
    }
  );

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
  if (error.logs) {
    console.error('Transaction logs:', error.logs);
  }
}