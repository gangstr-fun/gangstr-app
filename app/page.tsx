"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import TopUpModal from "@/components/TopUpModal";
import AutoInvestFlow from "@/components/AutoInvestFlow";
import { ArrowRight, Zap, Wallet, Shield, Users, TrendingUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * gangstr.fun Landing Page - Trustless Copy Trading Protocol
 * Enables traders to run private strategies in Phala TEEs and followers
 * to copy trades automatically with cryptographic proof verification
 */
export default function HomePage() {
  const { authenticated, login } = usePrivy();
  const { activeWalletAddress, activeWalletStatus } =
    useUnifiedWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [isAutoInvestOpen, setIsAutoInvestOpen] = useState(false);
  const [lastTopUpAmount, setLastTopUpAmount] = useState<string>("");
  const [lastTopUpToken, setLastTopUpToken] = useState<string>("");
  const router = useRouter();

  // Auto-redirect to dashboard if user is fully set up
  useEffect(() => {
    if (
      authenticated &&
      activeWalletAddress &&
      activeWalletStatus === "connected"
    ) {
      router.push("/pro/dashboard");
    }
  }, [authenticated, activeWalletAddress, activeWalletStatus, router]);

  const handleConnect = async () => {
    if (!authenticated) {
      setIsConnecting(true);
      try {
        await login();
      } catch (error) {
        console.error("Connection failed:", error);
      } finally {
        setIsConnecting(false);
      }
    } else if (activeWalletAddress && activeWalletStatus === "connected") {
      // User is authenticated and connected, redirect to dashboard
      router.push("/pro/dashboard");
    }
  };

  const handleTopUpSuccess = (amount: string, token: string) => {
    setShowTopUpModal(false);
    setLastTopUpAmount(amount);
    setLastTopUpToken(token);
    // Redirect to dashboard after top-up
    router.push("/pro/dashboard");
  };

  const handleInvestmentComplete = (success: boolean) => {
    if (success) {
      // Redirect to dashboard after successful investment
      router.push("/pro/dashboard");
    }
  };

  const getConnectionStatus = () => {
    if (!authenticated) return "Connect Wallet";
    if (activeWalletStatus === "loading") return "Setting up...";
    if (activeWalletStatus === "connected") return "Go to Dashboard";
    return "Finalizing setup...";
  };

  const isLoading =
    isConnecting || (authenticated && activeWalletStatus === "loading");

  return (
    <div className="flex flex-col bg-gradient-to-br from-gray-50 to-primary-50/30 overflow-hidden">
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-around gap-8 text-center mt-10 py-28 lg:text-left">
            {/* Left: Hero Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary-200">
                <Shield size={16} />
                <span>Trustless Copy Trading</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Copy trades with{" "}
                <span className="gradient-text">zero trust</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Run private strategies in Phala TEEs. Copy trades automatically
                with cryptographic proof verification. No API keys. No trust
                required.
              </p>

              {/* Key Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="flex items-start gap-3 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200">
                  <Shield className="text-primary-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 mb-1">
                      Private Execution
                    </h3>
                    <p className="text-xs text-gray-600">
                      Strategies run in Phala TEE enclaves
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200">
                  <Zap className="text-primary-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 mb-1">
                      Provable Performance
                    </h3>
                    <p className="text-xs text-gray-600">
                      Every trade verified via zkVerify proofs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200">
                  <Users className="text-primary-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 mb-1">
                      Non-Custodial
                    </h3>
                    <p className="text-xs text-gray-600">
                      Funds stay in smart contract vaults
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center lg:justify-start">
                <Button
                  onClick={handleConnect}
                  disabled={isLoading}
                  variant="modern"
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{getConnectionStatus()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Wallet size={20} />
                      <span>
                        {authenticated && activeWalletStatus === "connected"
                          ? "Go to Dashboard"
                          : "Get Started"}
                      </span>
                      <ArrowRight size={20} />
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Right: How It Works */}
            <div className="w-full lg:w-auto max-w-sm lg:max-w-none">
              <aside className="space-y-6">
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary-600" />
                    For Traders
                  </h3>
                  <ol className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">1.</span>
                      <span>Create strategy via form</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">2.</span>
                      <span>Deploy to Phala TEE (private)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">3.</span>
                      <span>Get attestation & register on-chain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">4.</span>
                      <span>Earn fees from followers</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={20} className="text-primary-600" />
                    For Followers
                  </h3>
                  <ol className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">1.</span>
                      <span>Browse verified strategies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">2.</span>
                      <span>Subscribe & deposit to vault</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">3.</span>
                      <span>Trades auto-mirror via proofs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary-600">4.</span>
                      <span>Track PnL & withdraw anytime</span>
                    </li>
                  </ol>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={handleTopUpSuccess}
      />

      <AutoInvestFlow
        isOpen={isAutoInvestOpen}
        onClose={() => setIsAutoInvestOpen(false)}
        amount={lastTopUpAmount}
        token={lastTopUpToken}
        onInvestmentComplete={handleInvestmentComplete}
      />
    </div>
  );
}
