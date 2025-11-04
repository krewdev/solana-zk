use anchor_lang::prelude::*;
use mpl_bubblegum::{
    instructions::MintV1CpiBuilder,
    types::{MetadataArgs, Creator, TokenStandard, TokenProgramVersion},
};
use spl_account_compression::{program::SplAccountCompression, Noop};

mod verifier;
use verifier::verify_proof;

declare_id!("mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6");

#[program]
pub mod aletheia_protocol {
    use super::*;

    pub fn verify_and_mint(
        ctx: Context<VerifyAndMint>,
        proof_data: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        msg!("🔍 Aletheia Protocol: Starting ZK proof verification...");

        // 1. VERIFY THE ZK PROOF
        let is_valid = verify_proof(&proof_data, &public_inputs);
        require!(is_valid, AletheiaError::InvalidProof);

        msg!("✅ ZK Proof verified successfully!");

        // 2. PREPARE METADATA FOR THE COMPRESSED ATTESTATION
        let metadata = MetadataArgs {
            name: "GitHub Developer".to_string(),
            symbol: "DEV".to_string(),
            uri: "https://aletheia-protocol.vercel.app/metadata.json".to_string(),
            collection: None,
            primary_sale_happened: false,
            is_mutable: false,
            edition_nonce: None,
            token_standard: Some(TokenStandard::NonFungible),
            uses: None,
            token_program_version: TokenProgramVersion::Original,
            creators: vec![Creator {
                address: ctx.accounts.payer.key(),
                verified: false,
                share: 100,
            }],
            seller_fee_basis_points: 0,
        };

        // 3. MINT THE COMPRESSED ATTESTATION VIA BUBBLEGUM CPI
        MintV1CpiBuilder::new(&ctx.accounts.bubblegum_program)
            .tree_config(&ctx.accounts.tree_authority)
            .leaf_owner(&ctx.accounts.payer)
            .leaf_delegate(&ctx.accounts.payer)
            .merkle_tree(&ctx.accounts.merkle_tree)
            .payer(&ctx.accounts.payer)
            .tree_creator_or_delegate(&ctx.accounts.payer)
            .log_wrapper(&ctx.accounts.log_wrapper)
            .compression_program(&ctx.accounts.compression_program)
            .system_program(&ctx.accounts.system_program)
            .metadata(metadata)
            .invoke()?;

        msg!("🎉 Compressed Attestation (cATT) minted successfully!");

        Ok(())
    }

    pub fn verify_proof_only(
        ctx: Context<VerifyProofOnly>,
        proof_data: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        msg!("🔍 Aletheia Protocol: Verifying ZK proof (verification only)...");

        // VERIFY THE ZK PROOF
        let is_valid = verify_proof(&proof_data, &public_inputs);
        require!(is_valid, AletheiaError::InvalidProof);

        msg!("✅ ZK Proof verified successfully! Proof data logged on-chain.");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyAndMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    /// CHECK: This account is validated by the Bubblegum program
    pub merkle_tree: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: This account is validated by the Bubblegum program
    pub tree_authority: AccountInfo<'info>,

    /// CHECK: This account is validated by the Bubblegum program
    pub log_wrapper: Program<'info, Noop>,

    pub compression_program: Program<'info, SplAccountCompression>,
    /// CHECK: This is the Bubblegum program ID
    pub bubblegum_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyProofOnly<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum AletheiaError {
    #[msg("Invalid ZK proof provided")]
    InvalidProof,
}