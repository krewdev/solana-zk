import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createCreateTreeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function initializeTreeCorrectly() {
  try {
    console.log('🌳 Initializing tree with official Metaplex SDK...');
    
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
    const [treeAuthority] = PublicKey.findProgramAddressSync(
      [merkleTreeKeypair.publicKey.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );

    console.log('Tree Authority:', treeAuthority.toString());

    // Create instruction with correct parameters
    const createTreeIx = createCreateTreeInstruction(
      {
        merkleTree: merkleTreeKeypair.publicKey,
        treeAuthority,
        treeCreator: payerKeypair.publicKey,
        payer: payerKeypair.publicKey,
        logWrapper: LOG_WRAPPER_ID,
        compressionProgram: COMPRESSION_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      },
      {
        maxDepth,
        maxBufferSize,
        public: true, // This was missing!
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
      console.error('Transaction failed:', confirmation.value.err);
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Tree initialization transaction confirmed!');
    
    // Wait and verify
    console.log('Waiting 5 seconds for account updates...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const updatedAccountInfo = await connection.getAccountInfo(merkleTreeKeypair.publicKey);
    const stillZero = updatedAccountInfo?.data.every(byte => byte === 0) || false;
    
    if (stillZero) {
      console.log('⚠️ Account still contains zeros after initialization');
    } else {
      console.log('🎉 SUCCESS! Account now contains proper Bubblegum tree data!');
      console.log('First 64 bytes:', Array.from(updatedAccountInfo?.data.slice(0, 64) || []).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }

    // Check tree authority
    const treeAuthorityInfo = await connection.getAccountInfo(treeAuthority);
    if (treeAuthorityInfo) {
      console.log('✅ Tree Authority PDA created successfully');
      console.log('Authority data size:', treeAuthorityInfo.data.length);
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
    
    console.log('\n🎉 TREE SUCCESSFULLY INITIALIZED!');
    console.log('Your compressed NFT minting should now work!');

  } catch (error) {
    console.error('❌ Failed to initialize tree:', error);
    
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
  }
}

initializeTreeCorrectly();