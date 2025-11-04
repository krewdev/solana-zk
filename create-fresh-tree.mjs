import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createCreateTreeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function createFreshBubblegumTree() {
  try {
    console.log('🌳 Creating a completely fresh Bubblegum tree...');
    
    // Load payer
    const payerKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('/Users/krewdev/.config/solana/id.json')))
    );

    // Generate a completely new tree keypair
    const merkleTreeKeypair = Keypair.generate();

    console.log('New Tree Account:', merkleTreeKeypair.publicKey.toString());
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

    // Create instruction - this will create the account AND initialize it
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
        public: true,
      }
    );

    const transaction = new Transaction().add(createTreeIx);
    
    console.log('Sending tree creation transaction...');
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

    console.log('✅ Tree creation transaction confirmed!');
    
    // Wait and verify
    console.log('Waiting 5 seconds for account updates...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const updatedAccountInfo = await connection.getAccountInfo(merkleTreeKeypair.publicKey);
    if (!updatedAccountInfo) {
      throw new Error('Tree account not found after creation');
    }
    
    const stillZero = updatedAccountInfo.data.every(byte => byte === 0);
    
    if (stillZero) {
      console.log('⚠️ Account still contains zeros - initialization may have failed');
    } else {
      console.log('🎉 SUCCESS! Account contains proper Bubblegum tree data!');
      console.log('Account size:', updatedAccountInfo.data.length);
      console.log('First 32 bytes:', Array.from(updatedAccountInfo.data.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }

    // Check tree authority
    const treeAuthorityInfo = await connection.getAccountInfo(treeAuthority);
    if (treeAuthorityInfo) {
      console.log('✅ Tree Authority PDA created successfully');
      console.log('Authority data size:', treeAuthorityInfo.data.length);
    } else {
      console.log('❌ Tree Authority PDA not found');
    }

    // Save the new tree keypair
    fs.writeFileSync('fresh-merkle-tree-keypair.json', JSON.stringify(Array.from(merkleTreeKeypair.secretKey)));

    // Save configuration
    const config = {
      merkleTree: merkleTreeKeypair.publicKey.toString(),
      treeAuthority: treeAuthority.toString(),
      maxDepth,
      maxBufferSize,
      signature,
      status: 'fresh_initialized',
      timestamp: new Date().toISOString(),
      transactionUrl: `https://solscan.io/tx/${signature}?cluster=devnet`
    };

    fs.writeFileSync('fresh-merkle-tree.json', JSON.stringify(config, null, 2));
    console.log('✅ Configuration saved to fresh-merkle-tree.json');
    console.log('✅ Keypair saved to fresh-merkle-tree-keypair.json');
    console.log('🔗 View transaction:', config.transactionUrl);
    
    console.log('\n🎉 FRESH TREE SUCCESSFULLY CREATED AND INITIALIZED!');
    console.log('📝 To use this tree, update your .env.local with:');
    console.log(`NEXT_PUBLIC_MERKLE_TREE=${merkleTreeKeypair.publicKey.toString()}`);
    console.log(`NEXT_PUBLIC_TREE_AUTHORITY=${treeAuthority.toString()}`);

  } catch (error) {
    console.error('❌ Failed to create fresh tree:', error);
    
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
  }
}

createFreshBubblegumTree();