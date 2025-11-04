import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction, SystemProgram } from '@solana/web3.js';
import { createCreateTreeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import fs from 'fs';

// Load the payer keypair
const payerKeypairPath = '/Users/krewdev/.config/solana/id.json';
const payerKeypairData = JSON.parse(fs.readFileSync(payerKeypairPath, 'utf8'));
const payerKeypair = Keypair.fromSecretKey(new Uint8Array(payerKeypairData));

console.log('🌳 Creating small tree with proper PDA authority...');
console.log('Payer:', payerKeypair.publicKey.toString());

async function createSmallTree() {
    try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Check current balance
        const balance = await connection.getBalance(payerKeypair.publicKey);
        console.log('Current balance:', balance / 1e9, 'SOL');
        
        // Generate a new keypair for the tree
        const treeKeypair = Keypair.generate();
        console.log('New Tree Account:', treeKeypair.publicKey.toString());

        // Standard program IDs
        const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
        const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');
        const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

        // Derive the proper tree authority PDA
        const [treeAuthority, bump] = PublicKey.findProgramAddressSync(
            [treeKeypair.publicKey.toBuffer()],
            BUBBLEGUM_PROGRAM_ID
        );
        
        console.log('Tree Authority (PDA):', treeAuthority.toString());
        console.log('Bump:', bump);
        
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
            maxDepth: 3, // Very small tree: 2^3 = 8 max leaves
            maxBufferSize: 8,
            public: { __option: 'Some', value: true },
        };

        // Create the instruction with correct parameter format
        const instruction = createCreateTreeInstruction(accounts, args);

        // Calculate space for a tiny tree
        const requiredSpace = 10240; // 10KB should be enough for depth 3

        console.log('Required space:', requiredSpace, 'bytes');
        const rentCost = await connection.getMinimumBalanceForRentExemption(requiredSpace);
        console.log('Rent cost:', rentCost / 1e9, 'SOL');

        // First create the account
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: payerKeypair.publicKey,
            newAccountPubkey: treeKeypair.publicKey,
            lamports: rentCost,
            space: requiredSpace,
            programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, // Tree account owned by compression program
        });

        const transaction = new Transaction().add(createAccountInstruction, instruction);
        
        console.log('Sending transaction...');
        const signature = await connection.sendTransaction(transaction, [payerKeypair, treeKeypair], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        console.log('✅ Small tree created successfully!');
        console.log('Transaction signature:', signature);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Save the tree info
        const treeInfo = {
            treeAddress: treeKeypair.publicKey.toString(),
            treeAuthority: treeAuthority.toString(),
            payer: payerKeypair.publicKey.toString(),
            signature: signature,
            bump: bump,
            maxDepth: 3,
            maxBufferSize: 8
        };

        fs.writeFileSync('small-tree-info.json', JSON.stringify(treeInfo, null, 2));
        console.log('Tree info saved to small-tree-info.json');

        // Check that the tree now has proper data
        console.log('Checking tree account...');
        const treeAccount = await connection.getAccountInfo(treeKeypair.publicKey);
        console.log('Tree account size:', treeAccount?.data.length);
        console.log('Tree account owner:', treeAccount?.owner.toString());
        
        // Check the first few bytes to see if it's no longer all zeros
        const firstBytes = treeAccount?.data.slice(0, 32);
        console.log('First 32 bytes:', Array.from(firstBytes || []).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // Count non-zero bytes
        const nonZeroBytes = Array.from(treeAccount?.data || []).filter(b => b !== 0).length;
        console.log('Non-zero bytes:', nonZeroBytes, 'out of', treeAccount?.data.length);

        return treeInfo;

    } catch (error) {
        console.error('❌ Failed to create small tree:', error);
        if (error.logs) {
            console.log('Transaction logs:', error.logs);
        }
        throw error;
    }
}

createSmallTree();