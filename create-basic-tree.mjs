import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createCreateTreeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

// Load the payer keypair
const payerKeypairPath = '/Users/krewdev/.config/solana/id.json';
const payerKeypairData = JSON.parse(fs.readFileSync(payerKeypairPath, 'utf8'));
const payerKeypair = Keypair.fromSecretKey(new Uint8Array(payerKeypairData));

console.log('🌳 Creating basic tree with direct instruction...');
console.log('Payer:', payerKeypair.publicKey.toString());

async function createBasicTree() {
    try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Generate a new keypair for the tree
        const treeKeypair = Keypair.generate();
        console.log('New Tree Account:', treeKeypair.publicKey.toString());

        // Use the payer as tree authority for simplicity
        const treeAuthority = payerKeypair.publicKey;
        console.log('Tree Authority:', treeAuthority.toString());

        // Standard program IDs
        const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
        const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');
        const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

        // Create the instruction with minimal parameters
        const instruction = createCreateTreeInstruction({
            treeAuthority,
            merkleTree: treeKeypair.publicKey,
            payer: payerKeypair.publicKey,
            treeCreator: payerKeypair.publicKey,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            maxDepth: 3, // Very small tree for testing
            maxBufferSize: 8,
        });

        // Create a transaction manually without UMI
        const { Transaction, SystemProgram } = await import('@solana/web3.js');
        
        // First create the account
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: payerKeypair.publicKey,
            newAccountPubkey: treeKeypair.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(10240), // 10KB for small tree
            space: 10240,
            programId: BUBBLEGUM_PROGRAM_ID,
        });

        const transaction = new Transaction().add(createAccountInstruction, instruction);
        
        const signature = await connection.sendTransaction(transaction, [payerKeypair, treeKeypair], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        console.log('✅ Tree created successfully!');
        console.log('Transaction signature:', signature);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Save the tree info
        const treeInfo = {
            treeAddress: treeKeypair.publicKey.toString(),
            treeAuthority: treeAuthority.toString(),
            payer: payerKeypair.publicKey.toString(),
            signature: signature
        };

        fs.writeFileSync('basic-tree-info.json', JSON.stringify(treeInfo, null, 2));
        console.log('Tree info saved to basic-tree-info.json');

        return treeInfo;

    } catch (error) {
        console.error('❌ Failed to create basic tree:', error);
        if (error.logs) {
            console.log('Transaction logs:', error.logs);
        }
        throw error;
    }
}

createBasicTree();