// Core exports
export { BountyManager } from "./core/BountyManager";
export { SecurityValidator } from "./core/SecurityValidator";

// Type exports
export * from "./core/types";

// Schema exports
export * from "./core/schemas";

// Utility exports
export * from "./utils/crypto";
export * from "./utils/helpers";

// Provider implementations
export { GitHubProvider } from "./providers/issue/GithubProvider";
export { SolanaProvider } from "./providers/payment/SolanaProvider";
export {
  DiscordProvider,
  DiscordProviderConfig,
} from "./providers/notification/DiscordProvider";

export const VERSION = "1.0.0";
