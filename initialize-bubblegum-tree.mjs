import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createCreateTreeInstruction, PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

// Program IDs as constants
const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');
const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function initializeBubblegumTree() {
  try {
    console.log('🌳 Initializing existing tree account with Bubblegum data...');
    
    // Load payer
    const payerKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('/Users/krewdev/.config/solana/id.json')))
    );

    // Load existing tree keypair
    const merkleTreeKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('merkle-tree-keypair.json')))
    );

    console.log('Tree Account:', merkleTreeKeypair.publicKey.toString());
    console.log('Payer:', payerKeypair.publicKey.toString());

    // Tree configuration
    const maxDepth = 14; // 2^14 = 16,384 leaves
    const maxBufferSize = 64; // Concurrent transactions

    // Calculate tree authority PDA
    const [treeAuthority] = PublicKey.findProgramAddressSync(
      [merkleTreeKeypair.publicKey.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );

    console.log('Tree Authority:', treeAuthority.toString());

    // Check current account state
    const accountInfo = await connection.getAccountInfo(merkleTreeKeypair.publicKey);
    if (!accountInfo) {
      throw new Error('Tree account does not exist');
    }

    console.log('Current account owner:', accountInfo.owner.toString());
    console.log('Current account size:', accountInfo.data.length);
    
    // Check if already initialized (not all zeros)
    const isZero = accountInfo.data.every(byte => byte === 0);
    if (isZero) {
      console.log('✅ Account contains all zeros - needs Bubblegum initialization');
      
      // Create the proper Bubblegum tree initialization instruction
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
          public: null, // optional flag; null defaults to private tree
        }
      );

      const transaction = new Transaction().add(createTreeIx);
      
      console.log('Sending initialization transaction...');
      const signature = await connection.sendTransaction(
        transaction,
        [payerKeypair, merkleTreeKeypair],
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );

      console.log('Transaction signature:', signature);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('🎉 Tree initialized successfully!');
      
      // Verify the tree is now properly initialized
      const updatedAccountInfo = await connection.getAccountInfo(merkleTreeKeypair.publicKey);
      const stillZero = updatedAccountInfo.data.every(byte => byte === 0);
      
      if (stillZero) {
        console.log('⚠️ Account still contains zeros after initialization');
      } else {
        console.log('✅ Account now contains proper Bubblegum tree data!');
        console.log('First 32 bytes:', updatedAccountInfo.data.slice(0, 32));
      }

      // Update configuration
      const config = {
        merkleTree: merkleTreeKeypair.publicKey.toString(),
        treeAuthority: treeAuthority.toString(),
        maxDepth,
        maxBufferSize,
        signature,
        status: 'initialized',
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync('initialized-merkle-tree.json', JSON.stringify(config, null, 2));
      console.log('✅ Configuration saved to initialized-merkle-tree.json');

    } else {
      console.log('ℹ️ Account already contains data (not all zeros)');
      console.log('First 32 bytes:', accountInfo.data.slice(0, 32));
    }

  } catch (error) {
    console.error('❌ Failed to initialize tree:', error);
    
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
  }
}

initializeBubblegumTree();