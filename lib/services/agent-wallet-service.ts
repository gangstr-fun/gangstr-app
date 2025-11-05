import { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Debug mode for detailed logging
const DEBUG = process.env.NODE_ENV !== "production";

/**
 * Agent Wallet Service
 *
 * This service manages the relationship between user wallets and agent wallets,
 * ensuring each user has exactly one agent wallet per connected wallet address.
 */
export class AgentWalletService {
  /**
   * Get the Prisma client instance for external use
   * @returns The Prisma client
   */
  static getPrismaClient() {
    return prisma;
  }
  /**
   * Get or create an agent wallet for a user
   *
   * @param userWalletAddress - The user's wallet address
   * @returns The agent wallet private key and ID
   */
  static async getOrCreateAgentWallet(userWalletAddress: string): Promise<{
    privateKey: Hex;
    agentId: string;
    agentWalletAddress: Address;
    smartWalletAddress?: Address;
  }> {
    try {
      if (DEBUG)
        console.log(
          `[AGENT WALLET] Processing agent wallet for user: ${userWalletAddress}`
        );

      if (!userWalletAddress) {
        throw new Error(
          "User wallet address is required to get or create an agent wallet"
        );
      }

      // 1. Check if user wallet already has an agent wallet in AgentWalletMap
      const existingMapping = await prisma.agentWalletMap.findUnique({
        where: { userWalletAddress },
      });

      if (DEBUG)
        console.log(
          `[AGENT WALLET] Existing mapping check result: ${!!existingMapping}`
        );

      if (existingMapping) {
        // 2. If mapping exists, get the agent wallet
        const agentWallet = await prisma.agentWallet.findUnique({
          where: { agent_id: existingMapping.agent_id },
        });

        if (DEBUG)
          console.log(
            `[AGENT WALLET] Existing wallet check result: ${!!agentWallet}`
          );

        if (agentWallet) {
          console.log(
            `[AGENT WALLET] Found existing agent wallet for user wallet: ${userWalletAddress}`
          );

          // Validate the private key format before returning
          try {
            const testAccount = privateKeyToAccount(
              agentWallet.walletPrivateKey as Hex
            );
            console.log(
              `[AGENT WALLET] Private key validation successful: ${testAccount.address}`
            );

            return {
              privateKey: agentWallet.walletPrivateKey as Hex,
              agentId: agentWallet.agent_id,
              agentWalletAddress: agentWallet.walletPublicKey as Address,
              smartWalletAddress: agentWallet.smartWalletAddress as
                | Address
                | undefined,
            };
          } catch (keyError) {
            console.error(
              `[AGENT WALLET] Corrupted private key detected for agent ${agentWallet.agent_id}:`,
              keyError
            );
            console.log(
              `[AGENT WALLET] Regenerating private key for agent ${agentWallet.agent_id}...`
            );

            // Generate a new private key
            const newPrivateKey = generatePrivateKey();
            const newAccount = privateKeyToAccount(newPrivateKey);

            // Update the agent wallet with the new private key and public address
            await prisma.agentWallet.update({
              where: { agent_id: agentWallet.agent_id },
              data: {
                walletPrivateKey: newPrivateKey,
                walletPublicKey: newAccount.address,
                // Reset smart wallet address since we have a new private key
                smartWalletAddress: null,
              },
            });

            console.log(
              `[AGENT WALLET] Private key regenerated successfully: ${newAccount.address}`
            );

            return {
              privateKey: newPrivateKey,
              agentId: agentWallet.agent_id,
              agentWalletAddress: newAccount.address,
              smartWalletAddress: undefined, // Will be set when smart wallet is created
            };
          }
        } else {
          console.warn(
            `[AGENT WALLET] Found mapping but no wallet for agent_id: ${existingMapping.agent_id}`
          );
        }
      }

      // 3. If no mapping or wallet exists, create a new one using a transaction
      console.log(
        `[AGENT WALLET] Creating new agent wallet for user wallet: ${userWalletAddress}`
      );
      const newAgentId = crypto.randomUUID();
      const newPrivateKey = generatePrivateKey();
      const account = privateKeyToAccount(newPrivateKey);

      if (DEBUG)
        console.log(
          `[AGENT WALLET] Generated new private key and account: ${account.address}`
        );

      try {
        // Use a transaction to ensure both records are created or neither is created
        const result = await prisma.$transaction([
          // 4. Store the new agent wallet
          prisma.agentWallet.create({
            data: {
              agent_id: newAgentId,
              walletPrivateKey: newPrivateKey,
              walletPublicKey: account.address,
            },
          }),

          // 5. Create the mapping between user wallet and agent wallet
          prisma.agentWalletMap.create({
            data: {
              agent_id: newAgentId,
              userWalletAddress,
            },
          }),
        ]);

        if (DEBUG)
          console.log(`[AGENT WALLET] Transaction result: ${!!result}`);

        // Verify the wallet was created by querying it back
        const verifyWallet = await prisma.agentWallet.findUnique({
          where: { agent_id: newAgentId },
        });

        if (!verifyWallet) {
          console.error(
            `[AGENT WALLET] Failed to verify wallet creation for agent_id: ${newAgentId}`
          );
          throw new Error("Failed to verify agent wallet creation");
        }

        console.log(
          `[AGENT WALLET] New agent wallet created and verified with address: ${account.address}`
        );
      } catch (txError) {
        // Handle duplicate races gracefully (idempotent behavior)
        if (
          txError instanceof Prisma.PrismaClientKnownRequestError &&
          txError.code === "P2002"
        ) {
          console.warn(
            "[AGENT WALLET] Duplicate creation race detected. Fetching existing mapping/wallet instead."
          );
          const mapping = await prisma.agentWalletMap.findUnique({
            where: { userWalletAddress },
          });
          if (mapping) {
            const existingWallet = await prisma.agentWallet.findUnique({
              where: { agent_id: mapping.agent_id },
            });
            if (existingWallet) {
              return {
                privateKey: existingWallet.walletPrivateKey as Hex,
                agentId: existingWallet.agent_id,
                agentWalletAddress: existingWallet.walletPublicKey as Address,
                smartWalletAddress: existingWallet.smartWalletAddress as
                  | Address
                  | undefined,
              };
            }
          }
          throw new Error("Duplicate detected but existing records not found");
        }
        console.error(
          "[AGENT WALLET] Transaction error during wallet creation:",
          txError
        );
        throw new Error(
          `Transaction failed: ${
            txError instanceof Error ? txError.message : "Unknown error"
          }`
        );
      }

      return {
        privateKey: newPrivateKey,
        agentId: newAgentId,
        agentWalletAddress: account.address,
        smartWalletAddress: undefined, // Will be set later when smart wallet is created
      };
    } catch (error) {
      console.error("[AGENT WALLET] Error in getOrCreateAgentWallet:", error);
      throw new Error(
        `Failed to get or create agent wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Update the smart wallet address for an agent wallet
   *
   * @param agentId - The agent ID
   * @param smartWalletAddress - The smart wallet address created on-chain
   */
  static async updateSmartWalletAddress(
    agentId: string,
    smartWalletAddress: Address
  ): Promise<void> {
    try {
      console.log(
        `[AGENT WALLET] Updating smart wallet address for agent ${agentId}: ${smartWalletAddress}`
      );

      await prisma.agentWallet.update({
        where: { agent_id: agentId },
        data: { smartWalletAddress },
      });

      console.log(`[AGENT WALLET] Smart wallet address updated successfully`);
    } catch (error) {
      console.error(
        "[AGENT WALLET] Error updating smart wallet address:",
        error
      );
      throw new Error(
        `Failed to update smart wallet address: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if a user wallet has an associated agent wallet
   *
   * @param userWalletAddress - The user's wallet address
   * @returns True if an agent wallet exists for this user
   */
  static async hasAgentWallet(userWalletAddress: string): Promise<boolean> {
    try {
      if (!userWalletAddress) {
        console.warn(
          "[AGENT WALLET] Empty user wallet address provided to hasAgentWallet"
        );
        return false;
      }

      const existingMapping = await prisma.agentWalletMap.findUnique({
        where: { userWalletAddress },
      });

      if (DEBUG)
        console.log(
          `[AGENT WALLET] hasAgentWallet check for ${userWalletAddress}: ${!!existingMapping}`
        );

      return !!existingMapping;
    } catch (error) {
      console.error("[AGENT WALLET] Error in hasAgentWallet:", error);
      return false;
    }
  }

  /**
   * Get the agent wallet address for a user wallet
   *
   * @param userWalletAddress - The user's wallet address
   * @returns The agent wallet address or null if not found
   */
  static async getAgentWalletAddress(
    userWalletAddress: string
  ): Promise<Address | null> {
    try {
      if (!userWalletAddress) {
        console.warn(
          "[AGENT WALLET] Empty user wallet address provided to getAgentWalletAddress"
        );
        return null;
      }

      const existingMapping = await prisma.agentWalletMap.findUnique({
        where: { userWalletAddress },
      });

      if (DEBUG)
        console.log(
          `[AGENT WALLET] Mapping lookup for ${userWalletAddress}: ${!!existingMapping}`
        );

      if (!existingMapping) {
        return null;
      }

      const agentWallet = await prisma.agentWallet.findUnique({
        where: { agent_id: existingMapping.agent_id },
      });

      if (DEBUG) {
        if (agentWallet) {
          console.log(
            `[AGENT WALLET] Found wallet address ${agentWallet.walletPublicKey} for user ${userWalletAddress}`
          );
        } else {
          console.warn(
            `[AGENT WALLET] No wallet found for agent_id: ${existingMapping.agent_id}`
          );
        }
      }

      return agentWallet ? (agentWallet.walletPublicKey as Address) : null;
    } catch (error) {
      console.error("[AGENT WALLET] Error in getAgentWalletAddress:", error);
      return null;
    }
  }

  /**
   * Smart Wallet Primary Approach: Get or create smart wallet as the primary agent wallet
   * This simplifies the architecture by using smart wallet as the main agent wallet
   *
   * @param userWalletAddress - The user's wallet address
   * @returns Promise with smart wallet data
   */
  static async getOrCreateSmartWallet(userWalletAddress: string): Promise<{
    smartWalletAddress?: Address;
    signerPrivateKey: Hex;
    agentId: string;
    isNewWallet: boolean;
  }> {
    try {
      if (DEBUG)
        console.log(
          `[SMART WALLET] Processing smart wallet for user: ${userWalletAddress}`
        );

      if (!userWalletAddress) {
        throw new Error(
          "User wallet address is required to get or create smart wallet"
        );
      }

      // 1. Check if user wallet already has a smart wallet
      const existingMapping = await prisma.agentWalletMap.findUnique({
        where: { userWalletAddress },
      });

      if (DEBUG)
        console.log(
          `[SMART WALLET] Existing mapping check result: ${!!existingMapping}`
        );

      if (existingMapping) {
        // 2. Get the existing agent wallet (which contains smart wallet data)
        const agentWallet = await prisma.agentWallet.findUnique({
          where: { agent_id: existingMapping.agent_id },
        });

        if (DEBUG)
          console.log(
            `[SMART WALLET] Existing wallet check result: ${!!agentWallet}`
          );

        if (agentWallet) {
          console.log(
            `[SMART WALLET] Found existing smart wallet for user: ${userWalletAddress}`
          );

          // Validate the private key format before returning
          try {
            const testAccount = privateKeyToAccount(
              agentWallet.walletPrivateKey as Hex
            );
            console.log(
              `[SMART WALLET] Signer key validation successful: ${testAccount.address}`
            );

            return {
              smartWalletAddress: agentWallet.smartWalletAddress as
                | Address
                | undefined,
              signerPrivateKey: agentWallet.walletPrivateKey as Hex,
              agentId: agentWallet.agent_id,
              isNewWallet: false,
            };
          } catch (keyError) {
            console.error(
              `[SMART WALLET] Corrupted signer key detected for agent ${agentWallet.agent_id}:`,
              keyError
            );
            console.log(
              `[SMART WALLET] Regenerating signer key for agent ${agentWallet.agent_id}...`
            );

            // Generate a new signer private key
            const newPrivateKey = generatePrivateKey();
            const newAccount = privateKeyToAccount(newPrivateKey);

            // Update the agent wallet with the new signer key and reset smart wallet address
            await prisma.agentWallet.update({
              where: { agent_id: agentWallet.agent_id },
              data: {
                walletPrivateKey: newPrivateKey,
                walletPublicKey: newAccount.address,
                smartWalletAddress: null, // Reset smart wallet address since we have new signer
              },
            });

            console.log(
              `[SMART WALLET] Signer key regenerated successfully: ${newAccount.address}`
            );

            return {
              smartWalletAddress: undefined, // Will be created fresh
              signerPrivateKey: newPrivateKey,
              agentId: agentWallet.agent_id,
              isNewWallet: true,
            };
          }
        }
      }

      // 3. Create new smart wallet setup
      console.log(
        `[SMART WALLET] Creating new smart wallet for user wallet: ${userWalletAddress}`
      );

      // Generate new signer private key for the smart wallet
      const newPrivateKey = generatePrivateKey();
      const newAccount = privateKeyToAccount(newPrivateKey);
      const newAgentId = crypto.randomUUID();

      if (DEBUG)
        console.log(
          `[SMART WALLET] Generated new signer key: ${newAccount.address}`
        );

      try {
        // Use a transaction to ensure both records are created or neither is created
        const result = await prisma.$transaction([
          // 4. Store the new agent wallet (smart wallet data)
          prisma.agentWallet.create({
            data: {
              agent_id: newAgentId,
              walletPrivateKey: newPrivateKey,
              walletPublicKey: newAccount.address, // This is the signer address
              smartWalletAddress: null, // Will be set after smart wallet creation
            },
          }),

          // 5. Create the mapping between user wallet and smart wallet
          prisma.agentWalletMap.create({
            data: {
              agent_id: newAgentId,
              userWalletAddress,
            },
          }),
        ]);

        if (DEBUG)
          console.log(`[SMART WALLET] Transaction result: ${!!result}`);

        // Verify the wallet was created by querying it back
        const verifyWallet = await prisma.agentWallet.findUnique({
          where: { agent_id: newAgentId },
        });

        if (!verifyWallet) {
          console.error(
            `[SMART WALLET] Failed to verify wallet creation for agent_id: ${newAgentId}`
          );
          throw new Error("Failed to verify smart wallet creation");
        }

        console.log(
          `[SMART WALLET] New smart wallet setup created for signer: ${newAccount.address}`
        );
      } catch (txError) {
        // Handle duplicate races gracefully (idempotent behavior)
        if (
          txError instanceof Prisma.PrismaClientKnownRequestError &&
          txError.code === "P2002"
        ) {
          console.warn(
            "[SMART WALLET] Duplicate creation race detected. Fetching existing mapping/wallet instead."
          );
          const mapping = await prisma.agentWalletMap.findUnique({
            where: { userWalletAddress },
          });
          if (mapping) {
            const existingWallet = await prisma.agentWallet.findUnique({
              where: { agent_id: mapping.agent_id },
            });
            if (existingWallet) {
              return {
                smartWalletAddress: existingWallet.smartWalletAddress as
                  | Address
                  | undefined,
                signerPrivateKey: existingWallet.walletPrivateKey as Hex,
                agentId: existingWallet.agent_id,
                isNewWallet: false,
              };
            }
          }
          throw new Error("Duplicate detected but existing records not found");
        }
        console.error(
          "[SMART WALLET] Transaction error during wallet creation:",
          txError
        );
        throw new Error(
          `Transaction failed: ${
            txError instanceof Error ? txError.message : "Unknown error"
          }`
        );
      }

      return {
        smartWalletAddress: undefined, // Will be created by SmartWalletProvider
        signerPrivateKey: newPrivateKey,
        agentId: newAgentId,
        isNewWallet: true,
      };
    } catch (error) {
      console.error("[SMART WALLET] Error in getOrCreateSmartWallet:", error);
      throw new Error(
        `Failed to get or create smart wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
