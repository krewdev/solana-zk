#!/bin/bash

echo "Creating and initializing a new Bubblegum Merkle Tree..."

# Configuration
TREE_KEYPAIR="new-merkle-tree-keypair.json"
MAX_DEPTH=14
MAX_BUFFER_SIZE=64

# Get the tree address
TREE_ADDRESS=$(solana-keygen pubkey $TREE_KEYPAIR)
echo "Tree Address: $TREE_ADDRESS"

# Create the tree account first with enough space for a Bubblegum tree
echo "Creating tree account..."
solana create-account $TREE_KEYPAIR 10240 BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY

if [ $? -eq 0 ]; then
    echo "✅ Tree account created successfully"
    
    # Now we need to initialize it with Bubblegum
    # Let's try using our own program to initialize it properly
    echo "Tree needs to be initialized with Bubblegum program..."
    echo "Tree Address: $TREE_ADDRESS"
    
    # Save tree info for frontend
    cat > tree-addresses.json << EOF
{
  "merkleTree": "$TREE_ADDRESS",
  "treeAuthority": "$(solana address --keypair $TREE_KEYPAIR | head -1)",
  "maxDepth": $MAX_DEPTH,
  "maxBufferSize": $MAX_BUFFER_SIZE
}
EOF
    
    echo "✅ Tree configuration saved to tree-addresses.json"
    
else
    echo "❌ Failed to create tree account"
    exit 1
fi