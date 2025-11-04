#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey, keypairIdentity } from '@metaplex-foundation/umi';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bubblegum = require('./frontend/node_modules/@metaplex-foundation/mpl-bubblegum');
const { setTreeDelegate } = bubblegum;

async function main() {
  const delegateAddress = process.argv[2];
  if (!delegateAddress) {
    console.error('Usage: node set-tree-delegate.mjs <delegate-pubkey>');
    process.exit(1);
  }

  const treeConfigPath = path.resolve(process.cwd(), 'compressed-nft-tree.json');
  if (!fs.existsSync(treeConfigPath)) {
    console.error('compressed-nft-tree.json not found. Run a tree creation script first.');
    process.exit(1);
  }

  const treeConfig = JSON.parse(fs.readFileSync(treeConfigPath, 'utf8'));
  const merkleTree = treeConfig.merkleTree;
  if (!merkleTree) {
    console.error('Missing merkleTree in compressed-nft-tree.json');
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const umi = createUmi(rpcUrl);

  const keypairFile = path.join(os.homedir(), '.config', 'solana', 'id.json');
  if (!fs.existsSync(keypairFile)) {
    console.error('Wallet keypair not found at ~/.config/solana/id.json');
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairFile, 'utf8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  console.log('🌲 Merkle Tree:', merkleTree);
  console.log('🔑 Tree creator (signer):', umi.identity.publicKey.toString());
  console.log('👤 New delegate:', delegateAddress);
  console.log('🌐 RPC:', rpcUrl);

  const tx = await setTreeDelegate(umi, {
    merkleTree: publicKey(merkleTree),
    newTreeDelegate: publicKey(delegateAddress),
  }).sendAndConfirm(umi, { send: { skipPreflight: false } });

  console.log('✅ Delegate updated!');
  console.log('🔗 Tx:', tx);
}

main().catch((err) => {
  console.error('❌ Failed to set tree delegate');
  console.error(err);
  process.exit(1);
});
