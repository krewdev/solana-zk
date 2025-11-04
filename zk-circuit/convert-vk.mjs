// convert-vk.mjs (Corrected Version)
import fs from "fs";

// Helper function to convert a hex string to a little-endian buffer
function hexToLeBuff(hex) {
    // Remove "0x" prefix and ensure it's a full 64 characters (32 bytes)
    const formattedHex = hex.startsWith("0x") ? hex.substring(2) : hex;
    const buff = Buffer.from(formattedHex.padStart(64, '0'), "hex");
    return buff.reverse(); // arkworks expects little-endian
}

// Load the verification_key.json
const vk = JSON.parse(fs.readFileSync("./zk-artifacts/verification_key.json", "utf-8"));

// Flatten the verification key points into a single buffer
const vk_flat_parts = [
    hexToLeBuff(vk.vk_alpha_1[0]),
    hexToLeBuff(vk.vk_alpha_1[1]),
    hexToLeBuff(vk.vk_beta_2[0][0]),
    hexToLeBuff(vk.vk_beta_2[0][1]),
    hexToLeBuff(vk.vk_beta_2[1][0]),
    hexToLeBuff(vk.vk_beta_2[1][1]),
    hexToLeBuff(vk.vk_gamma_2[0][0]),
    hexToLeBuff(vk.vk_gamma_2[0][1]),
    hexToLeBuff(vk.vk_gamma_2[1][0]),
    hexToLeBuff(vk.vk_gamma_2[1][1]),
    hexToLeBuff(vk.vk_delta_2[0][0]),
    hexToLeBuff(vk.vk_delta_2[0][1]),
    hexToLeBuff(vk.vk_delta_2[1][0]),
    hexToLeBuff(vk.vk_delta_2[1][1]),
];

// Add the public input commitments (IC)
vk.IC.forEach(p => {
    vk_flat_parts.push(hexToLeBuff(p[0]));
    vk_flat_parts.push(hexToLeBuff(p[1]));
});

// Concatenate all parts into one final buffer
const final_buffer = Buffer.concat(vk_flat_parts);

// Write the bytes to a file
fs.writeFileSync("./solana-program/src/verification_key.bin", final_buffer);

console.log(`✅ verification_key.bin created successfully! (${final_buffer.length} bytes)`);