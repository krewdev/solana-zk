import { Connection, Keypair, PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function initializeTreeWithBubblegum() {
  try {
    console.log('🌳 Initializing tree with proper Bubblegum data...');
    
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

    // Program IDs
    const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
    const COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');
    const LOG_WRAPPER_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');

    // Tree configuration
    const maxDepth = 14; // 2^14 = 16,384 leaves
    const maxBufferSize = 64; // Concurrent transactions

    // Calculate tree authority PDA
    const [treeAuthority, bump] = PublicKey.findProgramAddressSync(
      [merkleTreeKeypair.publicKey.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );

    console.log('Tree Authority:', treeAuthority.toString());
    console.log('Authority Bump:', bump);

    // Create the Bubblegum create_tree instruction manually
    // This uses the correct instruction format for Bubblegum
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: merkleTreeKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: treeAuthority, isSigner: false, isWritable: true },
        { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true }, // payer
        { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: false }, // tree_creator
        { pubkey: LOG_WRAPPER_ID, isSigner: false, isWritable: false },
        { pubkey: COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: BUBBLEGUM_PROGRAM_ID,
      data: Buffer.concat([
        // Instruction discriminator for create_tree (8 bytes)
        Buffer.from([165, 83, 136, 142, 89, 202, 47, 220]),
        // max_depth (u32 - 4 bytes)
        Buffer.from(new Uint8Array(new Uint32Array([maxDepth]).buffer)),
        // max_buffer_size (u32 - 4 bytes) 
        Buffer.from(new Uint8Array(new Uint32Array([maxBufferSize]).buffer)),
        // public flag (bool - 1 byte)
        Buffer.from([1]), // true for public tree
      ])
    });

    const transaction = new Transaction().add(instruction);
    
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
      console.error('Transaction failed:', confirmation.value.err);
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Tree initialization transaction confirmed!');
    
    // Wait a moment then verify the tree is now properly initialized
    console.log('Waiting 3 seconds for account updates...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const updatedAccountInfo = await connection.getAccountInfo(merkleTreeKeypair.publicKey);
    const stillZero = updatedAccountInfo?.data.every(byte => byte === 0) || false;
    
    if (stillZero) {
      console.log('⚠️ Account still contains zeros after initialization');
    } else {
      console.log('🎉 SUCCESS! Account now contains proper Bubblegum tree data!');
      console.log('First 32 bytes:', updatedAccountInfo?.data.slice(0, 32));
    }

    // Check tree authority
    const treeAuthorityInfo = await connection.getAccountInfo(treeAuthority);
    if (treeAuthorityInfo) {
      console.log('✅ Tree Authority PDA created successfully');
    } else {
      console.log('❌ Tree Authority PDA not found');
    }

    // Save updated configuration
    const config = {
      merkleTree: merkleTreeKeypair.publicKey.toString(),
      treeAuthority: treeAuthority.toString(),
      maxDepth,
      maxBufferSize,
      signature,
      status: 'initialized',
      timestamp: new Date().toISOString(),
      transactionUrl: `https://solscan.io/tx/${signature}?cluster=devnet`
    };

    fs.writeFileSync('final-merkle-tree.json', JSON.stringify(config, null, 2));
    console.log('✅ Configuration saved to final-merkle-tree.json');
    console.log('🔗 View transaction:', config.transactionUrl);

  } catch (error) {
    console.error('❌ Failed to initialize tree:', error);
    
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
  }
}

initializeTreeWithBubblegum();