"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { encodeFunctionData, parseUnits } from "viem";
import { CHAIN_TOKENS, SUPPORTED_CHAINS } from "@/lib/data";
import { TopUpModalProps } from "@/lib/types";
import { ERC20_ABI } from "@/lib/crypto/data"

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);


  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const { activeWalletAddress, walletMode } = useUnifiedWallet();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedChain("");
      setSelectedToken("");
      setAmount("");
      setError("");
      setIsSwitchingNetwork(false);
    }
  }, [isOpen]);

  // Get available tokens for selected chain
  const availableTokens = selectedChain ? CHAIN_TOKENS[selectedChain] || [] : [];

  // Find selected token info
  const selectedTokenInfo = availableTokens.find(
    (token) => token.symbol === selectedToken
  );

  // Find selected chain info
  const selectedChainInfo = SUPPORTED_CHAINS.find(
    (chain) => chain.id === selectedChain
  );

  // Middle truncate a long string like a wallet address
  const formatAddress = (addr?: string, prefix: number = 6, suffix: number = 6) => {
    if (!addr) return "";
    if (addr.length <= prefix + suffix + 3) return addr;
    return `${addr.slice(0, prefix)}…${addr.slice(-suffix)}`;
  };

  const handleCopy = async () => {
    if (!activeWalletAddress) return;
    try {
      await navigator.clipboard.writeText(activeWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { }
  };

  const handleDeposit = async () => {
    if (!selectedChain || !selectedToken || !amount || !activeWalletAddress) {
      setError("Please fill in all fields");
      return;
    }

    if (!selectedTokenInfo) {
      setError("Invalid token selected");
      return;
    }

    if (!selectedChainInfo) {
      setError("Invalid chain selected");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Check if user has connected wallets
    if (!wallets || wallets.length === 0) {
      setError("No connected wallet found. Please connect your wallet first.");
      return;
    }

    setIsDepositing(true);
    setError("");

    try {
      // Step 1: Check if user is on the correct network
      const currentWallet = wallets[0];

      // Check if wallet is on the correct chain
      if (currentWallet.chainId !== `eip155:${selectedChainInfo.chainId}`) {
        console.log(`Switching from chain ${currentWallet.chainId} to ${selectedChainInfo.chainId}`);

        setIsSwitchingNetwork(true);

        try {
          // Switch to the correct network first using Privy's wallet.switchChain
          await currentWallet.switchChain(selectedChainInfo.chainId);

          // Wait a moment for the network switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));

          setIsSwitchingNetwork(false);
        } catch (switchError: any) {
          console.error("Failed to switch network:", switchError);
          setError(`Please switch your wallet to ${selectedChainInfo.name} manually and try again.`);
          setIsDepositing(false);
          setIsSwitchingNetwork(false);
          return;
        }
      }

      // Step 2: Prepare transaction data
      const transactionData: any = {
        to: activeWalletAddress,
      };

      if (selectedTokenInfo.symbol === "ETH") {
        // For native ETH, send as value
        transactionData.value = parseUnits(amount, selectedTokenInfo.decimals);
      } else {
        // For ERC20 tokens, use the standard transfer function
        const amountInWei = parseUnits(amount, selectedTokenInfo.decimals);

        transactionData.to = selectedTokenInfo.address;
        transactionData.data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [activeWalletAddress as `0x${string}`, amountInWei],
        });
      }

      // Step 3: Send transaction through Privy with wallet specification
      const txHash = await sendTransaction(
        transactionData,
        {
          address: wallets[0].address // Use the first connected wallet
        }
      );

      if (txHash) {
        // Success - close modal and show success message
        console.log("Deposit successful! Transaction hash:", txHash);

        // Call onSuccess callback with amount and token info
        if (onSuccess) {
          onSuccess(amount, selectedToken);
        } else {
          onClose();
        }

        // You could add a toast notification here
      }
    } catch (error: any) {
      console.error("Deposit failed:", error);
      setError(
        error.message || "Transaction failed. Please try again."
      );
    } finally {
      setIsDepositing(false);
      setIsSwitchingNetwork(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mx-4 w-[calc(100vw-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto sm:mx-auto sm:w-full">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">Top Up Agent Wallet</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Deposit tokens to your agent wallet to enable automated trading and
            DeFi operations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Agent Wallet Address Display */}
          {activeWalletAddress && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Agent Wallet Address</label>
              <div className="flex items-center gap-2 p-2 bg-muted/50 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-muted-foreground whitespace-nowrap overflow-hidden">
                    {formatAddress(activeWalletAddress, 10, 10)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Copy wallet address"
                  onClick={handleCopy}
                  className="h-8 px-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="space-y-3">
            {/* Wallet Connection Status */}
            {(!wallets || wallets.length === 0) && (
              <div className="flex items-start gap-3 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="w-4 h-4 rounded-full bg-destructive/20 flex-shrink-0 mt-0.5"></div>
                <span>No wallet connected. Please connect your wallet to make deposits.</span>
              </div>
            )}

            {/* Network Mismatch Warning */}
            {wallets && wallets.length > 0 && selectedChainInfo &&
              wallets[0].chainId !== `eip155:${selectedChainInfo.chainId}` && (
                <div className="flex items-start gap-3 p-2 text-sm text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-orange-200 dark:bg-orange-800 flex-shrink-0 mt-0.5"></div>
                  <span className="text-xs">⚠️ Network mismatch: You&apos;ll be prompted to switch to {selectedChainInfo.name} before making the deposit.</span>
                </div>
              )}
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Chain Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Chain</label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="h-11 border-input">
                  <SelectValue placeholder="Choose a blockchain network" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CHAINS.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id}>
                      <span className="font-medium">{chain.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Token Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Token</label>
              <Select
                value={selectedToken}
                onValueChange={setSelectedToken}
                disabled={!selectedChain}
              >
                <SelectTrigger className="h-11 border-input">
                  <SelectValue placeholder="Choose a token" />
                </SelectTrigger>
                <SelectContent>
                  {availableTokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {token.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Amount</label>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 text-base"
                  disabled={!selectedToken}
                  step="any"
                  min="0"
                />
                {selectedTokenInfo && (
                  <p className="text-xs text-muted-foreground">
                    Minimum: 0.000001 {selectedTokenInfo.symbol}
                  </p>
                )}
              </div>
            </div>

            {/* Auto-Investment Info */}
            <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-green-800">Automatic Investment</h4>
                <p className="text-xs text-green-700">
                  Your deposited funds will be automatically invested into the best performing Morpho vaults (USDC, WETH) with daily rebalancing.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-green-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600">Target APY:</span>
                  <span className="font-medium text-green-800">8-12%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600">Rebalancing:</span>
                  <span className="font-medium text-green-800">Daily</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600">Withdrawal:</span>
                  <span className="font-medium text-green-800">Anytime</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="w-4 h-4 rounded-full bg-destructive/20 flex-shrink-0 mt-0.5"></div>
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDepositing}
            className="flex-1 sm:flex-none h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={
              !selectedChain ||
              !selectedToken ||
              !amount ||
              !activeWalletAddress ||
              !wallets ||
              wallets.length === 0 ||
              isDepositing ||
              isSwitchingNetwork
            }
            className="flex-1 sm:flex-none h-11"
          >
            {isSwitchingNetwork ? "Switching Network..." :
              isDepositing ? "Processing..." :
                (wallets && wallets.length > 0 && selectedChainInfo &&
                  wallets[0].chainId !== `eip155:${selectedChainInfo.chainId}` ?
                  `Switch to ${selectedChainInfo.name?.split(' ')[0]} & Deposit` : "Deposit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpModal;