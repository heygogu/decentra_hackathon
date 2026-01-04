import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { serialize } from "borsh";
import {
  IPaymentProvider,
  PaymentProviderConfig,
  TransactionResult,
} from "../../core/types";
import {
  CreateEscrowInstruction,
  CreateEscrowSchema,
  ReleaseEscrowInstruction,
  ReleaseEscrowSchema,
  InstructionDiscriminator,
} from "../../core/schemas";
import { getRepositoryHash } from "../../utils/crypto";
import { numberToLeBytes, loadKeypair } from "../../utils/helpers";

export class SolanaProvider implements IPaymentProvider {
  private connection: Connection;
  private payer: Keypair;
  private programId: PublicKey;
  private network: string;

  constructor(config: PaymentProviderConfig) {
    this.network = config.network || "devnet";
    const rpcUrl = config.rpcUrl || this.getDefaultRpcUrl(this.network);
    this.connection = new Connection(rpcUrl, "confirmed");
    this.payer = loadKeypair(config.keypairJson);
    this.programId = new PublicKey(config.programId);
  }

  async createEscrow(
    issueNumber: number,
    repositoryHash: Buffer,
    amount: number
  ): Promise<TransactionResult> {
    console.log(
      `Creating escrow for issue #${issueNumber}, amount: ${amount} lamports`
    );

    // Derive PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), repositoryHash, numberToLeBytes(issueNumber)],
      this.programId
    );

    console.log(`  Escrow PDA: ${escrowPda.toBase58()}`);

    // Check if escrow already exists
    const accountInfo = await this.connection.getAccountInfo(escrowPda);
    if (accountInfo) {
      throw new Error("Escrow already exists for this issue");
    }

    // Create instruction with Borsh
    const createInstruction = new CreateEscrowInstruction({
      repo_hash: Array.from(repositoryHash),
      issue_number: BigInt(issueNumber),
      amount: BigInt(amount),
    });

    const instructionData = serialize(CreateEscrowSchema, createInstruction);
    const data = Buffer.concat([
      Buffer.from([InstructionDiscriminator.CreateEscrow]),
      Buffer.from(instructionData),
    ]);

    // Build transaction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await this.connection.sendTransaction(transaction, [
      this.payer,
    ]);
    await this.connection.confirmTransaction(signature);

    console.log(`Escrow created! Tx: ${signature}`);

    return {
      signature,
      explorerUrl: this.getExplorerUrl(signature),
    };
  }

  async releaseEscrow(
    issueNumber: number,
    repositoryHash: Buffer,
    recipient: PublicKey
  ): Promise<TransactionResult> {
    console.log(
      `Releasing escrow for issue #${issueNumber} to ${recipient.toBase58()}`
    );

    // Derive PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), repositoryHash, numberToLeBytes(issueNumber)],
      this.programId
    );

    console.log(`  Escrow PDA: ${escrowPda.toBase58()}`);

    // Verify escrow exists
    const accountInfo = await this.connection.getAccountInfo(escrowPda);
    if (!accountInfo) {
      throw new Error("Escrow does not exist for this issue");
    }

    // Create instruction with Borsh
    const releaseInstruction = new ReleaseEscrowInstruction({
      repo_hash: Array.from(repositoryHash),
      issue_number: BigInt(issueNumber),
    });

    const instructionData = serialize(ReleaseEscrowSchema, releaseInstruction);
    const data = Buffer.concat([
      Buffer.from([InstructionDiscriminator.ReleaseEscrow]),
      Buffer.from(instructionData),
    ]);

    // Build transaction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await this.connection.sendTransaction(transaction, [
      this.payer,
    ]);
    await this.connection.confirmTransaction(signature);

    console.log(`Escrow released! Tx: ${signature}`);

    return {
      signature,
      explorerUrl: this.getExplorerUrl(signature),
    };
  }

  async escrowExists(
    issueNumber: number,
    repositoryHash: Buffer
  ): Promise<boolean> {
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), repositoryHash, numberToLeBytes(issueNumber)],
      this.programId
    );

    const accountInfo = await this.connection.getAccountInfo(escrowPda);
    return accountInfo !== null;
  }

  getRepositoryHash(repositoryName: string): Buffer {
    return getRepositoryHash(repositoryName);
  }

  parseWalletAddress(address: string): PublicKey {
    try {
      return new PublicKey(address);
    } catch (error) {
      throw new Error("Invalid Solana wallet address");
    }
  }

  private getDefaultRpcUrl(network: string): string {
    const urls: Record<string, string> = {
      "mainnet-beta": "https://api.mainnet-beta.solana.com",
      devnet: "https://api.devnet.solana.com",
      testnet: "https://api.testnet.solana.com",
    };
    return urls[network] || urls.devnet;
  }

  private getExplorerUrl(signature: string): string {
    const cluster =
      this.network === "mainnet-beta" ? "" : `?cluster=${this.network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }
}
