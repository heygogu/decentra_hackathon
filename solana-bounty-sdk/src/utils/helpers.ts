import { Keypair } from "@solana/web3.js";

/**
 * Convert number to little-endian u64 bytes
 */
export function numberToLeBytes(num: number): Buffer {
  const buffer = Buffer.allocUnsafe(8);
  buffer.writeBigUInt64LE(BigInt(num));
  return buffer;
}

/**
 * Load Solana keypair from JSON string
 */
export function loadKeypair(keypairJson: string): Keypair {
  try {
    const keypairArray = JSON.parse(keypairJson);
    return Keypair.fromSecretKey(Uint8Array.from(keypairArray));
  } catch (error) {
    throw new Error("Invalid keypair JSON format");
  }
}

/**
 * Extract issue numbers from PR description
 * Matches patterns like "Fixes #123", "Closes #456", etc.
 */
export function extractIssueNumbers(text: string): number[] {
  const patterns = [
    /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi,
    /#(\d+)/g,
  ];

  const numbers = new Set<number>();

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      numbers.add(parseInt(match[1], 10));
    }
  }

  return Array.from(numbers);
}

/**
 * Convert lamports to SOL for display
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
