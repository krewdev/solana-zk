import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction, SystemProgram } from '@solana/web3.js';
import { createCreateTreeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

// Load the payer keypair
const payerKeypairPath = '/Users/krewdev/.config/solana/id.json';
const payerKeypairData = JSON.parse(fs.readFileSync(payerKeypairPath, 'utf8'));
const payerKeypair = Keypair.fromSecretKey(new Uint8Array(payerKeypairData));

console.log('🌳 Creating correctly formatted tree...');
console.log('Payer:', payerKeypair.publicKey.toString());

async function createCorrectTree() {
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

        // Separate accounts and args as expected by the SDK
        const accounts = {
            treeAuthority,
            merkleTree: treeKeypair.publicKey,
            payer: payerKeypair.publicKey,
            treeCreator: payerKeypair.publicKey,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        };

        const args = {
            maxDepth: 3, // Very small tree for testing
            maxBufferSize: 8,
            public: { __option: 'Some', value: true }, // Proper beet COption format
        };

        // Create the instruction with correct parameter format
        const instruction = createCreateTreeInstruction(accounts, args);

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

        fs.writeFileSync('correct-tree-info.json', JSON.stringify(treeInfo, null, 2));
        console.log('Tree info saved to correct-tree-info.json');

        return treeInfo;

    } catch (error) {
        console.error('❌ Failed to create correct tree:', error);
        if (error.logs) {
            console.log('Transaction logs:', error.logs);
        }
        throw error;
    }
}

createCorrectTree();