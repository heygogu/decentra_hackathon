import dotenv from "dotenv";

dotenv.config();

/**
 * Validate and export environment configuration
 */
class EnvironmentConfig {
  readonly PORT: number;
  readonly NODE_ENV: string;

  readonly GITHUB_TOKEN: string;
  readonly GITHUB_WEBHOOK_SECRET: string;

  readonly SOLANA_KEYPAIR: string;
  readonly PROGRAM_ID: string;
  readonly SOLANA_NETWORK: "mainnet-beta" | "devnet" | "testnet";

  readonly DISCORD_WEBHOOK_URL?: string;
  readonly SLACK_WEBHOOK_URL?: string;

  readonly SKIP_ASSIGNMENT_CHECK: boolean;
  readonly REQUIRE_MERGED_PR: boolean;
  readonly REQUIRE_MAINTAINER_FOR_BOUNTY_CREATION: boolean;

  constructor() {
    this.PORT = parseInt(process.env.PORT || "3000", 10);
    this.NODE_ENV = process.env.NODE_ENV || "development";

    this.GITHUB_TOKEN = this.getRequired("GITHUB_TOKEN");
    this.GITHUB_WEBHOOK_SECRET = this.getRequired("GITHUB_WEBHOOK_SECRET");

    this.SOLANA_KEYPAIR = this.getRequired("SOLANA_KEYPAIR");
    this.PROGRAM_ID = this.getRequired("PROGRAM_ID_TWO");
    this.SOLANA_NETWORK = this.validateNetwork(
      process.env.SOLANA_NETWORK || "devnet"
    );
    this.DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    this.SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

    this.SKIP_ASSIGNMENT_CHECK = process.env.SKIP_ASSIGNMENT_CHECK === "true";
    this.REQUIRE_MERGED_PR = process.env.REQUIRE_MERGED_PR !== "false";
    this.REQUIRE_MAINTAINER_FOR_BOUNTY_CREATION =
      process.env.REQUIRE_MAINTAINER_FOR_BOUNTY_CREATION !== "false";

    this.validate();
  }

  private getRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private validateNetwork(
    network: string
  ): "mainnet-beta" | "devnet" | "testnet" {
    const validNetworks = ["mainnet-beta", "devnet", "testnet"];
    if (!validNetworks.includes(network)) {
      throw new Error(
        `Invalid SOLANA_NETWORK: ${network}. Must be one of: ${validNetworks.join(", ")}`
      );
    }
    return network as "mainnet-beta" | "devnet" | "testnet";
  }

  private validate(): void {
    try {
      JSON.parse(this.SOLANA_KEYPAIR);
    } catch (error) {
      throw new Error("SOLANA_KEYPAIR must be a valid JSON array");
    }

    if (this.PROGRAM_ID.length < 32) {
      throw new Error("PROGRAM_ID appears to be invalid (too short)");
    }

    console.log("   Environment configuration validated");
    console.log(`   PORT: ${this.PORT}`);
    console.log(`   NODE_ENV: ${this.NODE_ENV}`);
    console.log(`   SOLANA_NETWORK: ${this.SOLANA_NETWORK}`);
    console.log(`   PROGRAM_ID: ${this.PROGRAM_ID}`); // ← Shows your program ID
    console.log(
      `   DISCORD: ${this.DISCORD_WEBHOOK_URL ? "Enabled" : "Disabled"}`
    );
    console.log(`   SLACK: ${this.SLACK_WEBHOOK_URL ? "Enabled" : "Disabled"}`);
  }
}

export const config = new EnvironmentConfig();
