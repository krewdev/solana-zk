import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createCreateTreeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import { createAccount } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import fs from 'fs';

// Load the payer keypair
const payerKeypairPath = '/Users/krewdev/.config/solana/id.json';
const payerKeypairData = JSON.parse(fs.readFileSync(payerKeypairPath, 'utf8'));
const payerKeypair = Keypair.fromSecretKey(new Uint8Array(payerKeypairData));

console.log('🌳 Creating simple Bubblegum tree with UMI...');
console.log('Payer:', payerKeypair.publicKey.toString());

async function createSimpleTree() {
    try {
        // Create UMI instance
        const umi = createUmi('https://api.devnet.solana.com');
        umi.use(keypairIdentity(fromWeb3JsKeypair(payerKeypair)));

        // Generate a new keypair for the tree
        const treeKeypair = Keypair.generate();
        const treeUmiKeypair = fromWeb3JsKeypair(treeKeypair);
        
        console.log('New Tree Account:', treeKeypair.publicKey.toString());

        // Create the tree account first
        const createAccountInstruction = await createAccount(umi, {
            newAccount: treeUmiKeypair,
            space: 1024 * 1024, // 1MB should be enough for a small tree
            programId: umi.programs.get('mplBubblegum').publicKey,
        });

        // Create the tree instruction
        const createTreeInstruction = createCreateTreeInstruction({
            treeAuthority: umi.identity.publicKey,
            merkleTree: treeUmiKeypair.publicKey,
            payer: umi.identity.publicKey,
            treeCreator: umi.identity.publicKey,
            logWrapper: umi.programs.get('splNoop').publicKey,
            compressionProgram: umi.programs.get('splAccountCompression').publicKey,
            maxDepth: 14,
            maxBufferSize: 64,
        });

        console.log('Tree Authority:', toWeb3JsPublicKey(umi.identity.publicKey).toString());

        // Create and send the transaction
        const transaction = await umi.transactions.create({
            instructions: [createAccountInstruction, createTreeInstruction],
            payer: umi.identity.publicKey,
        });

        const result = await transaction.sendAndConfirm(umi);
        console.log('✅ Tree created successfully!');
        console.log('Transaction signature:', result.signature);
        
        // Save the tree info
        const treeInfo = {
            treeAddress: treeKeypair.publicKey.toString(),
            treeAuthority: toWeb3JsPublicKey(umi.identity.publicKey).toString(),
            payer: payerKeypair.publicKey.toString(),
            signature: result.signature
        };

        fs.writeFileSync('simple-tree-info.json', JSON.stringify(treeInfo, null, 2));
        console.log('Tree info saved to simple-tree-info.json');

        return treeInfo;

    } catch (error) {
        console.error('❌ Failed to create simple tree:', error);
        if (error.transactionLogs) {
            console.log('Transaction logs:', error.transactionLogs);
        }
        throw error;
    }
}

createSimpleTree();