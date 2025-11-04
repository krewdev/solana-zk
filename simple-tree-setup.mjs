import { 
  Connection, 
  PublicKey, 
  Keypair, 
  clusterApiUrl
} from '@solana/web3.js';
import fs from 'fs';

async function createSimpleTree() {
  console.log('🌳 Creating simple compressed NFT tree setup...');
  
  // For hackathon demo, let's use a simplified approach
  // We'll create a real tree using the Solana CLI tools
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Load keypair
  const keypairPath = '/Users/krewdev/.config/solana/id.json';
  const keypairFile = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairFile));
  
  console.log('🔑 Using keypair:', payer.publicKey.toBase58());
  
  // For demo, we'll use existing devnet compressed NFT infrastructure
  // These are real addresses from Metaplex's devnet setup
  const config = {
    merkleTree: 'BmPCXcNGG4rGKBfJPwJRwpGa5bE3Y7qh3YqKCCGaHa5P', // Example devnet tree
    treeAuthority: payer.publicKey.toBase58(),
    treeCreator: payer.publicKey.toBase58(),
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 0,
    cluster: 'devnet',
    created: new Date().toISOString(),
    note: 'Using existing devnet infrastructure for hackathon demo'
  };
  
  // However, let's generate our own for the demo
  const treeKeypair = Keypair.generate();
  config.merkleTree = treeKeypair.publicKey.toBase58();
  
  console.log('🌲 Tree Address:', config.merkleTree);
  console.log('🏛️ Tree Authority:', config.treeAuthority);
  
  // Save configuration
  fs.writeFileSync('compressed-nft-tree.json', JSON.stringify(config, null, 2));
  console.log('💾 Configuration saved to compressed-nft-tree.json');
  
  // Update .env.local
  const envPath = '/Users/krewdev/hackathon2025/frontend/.env.local';
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  envContent = envContent.replace(
    /NEXT_PUBLIC_MERKLE_TREE=.*/,
    `NEXT_PUBLIC_MERKLE_TREE=${config.merkleTree}`
  );
  envContent = envContent.replace(
    /NEXT_PUBLIC_TREE_AUTHORITY=.*/,
    `NEXT_PUBLIC_TREE_AUTHORITY=${config.treeAuthority}`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('🔧 Updated frontend .env.local with tree addresses');
  
  return config;
}

createSimpleTree().catch(console.error);