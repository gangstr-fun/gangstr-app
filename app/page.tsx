"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import TopUpModal from "@/components/TopUpModal";
import AutoInvestFlow from "@/components/AutoInvestFlow";
import { ArrowRight, Zap, Wallet } from "lucide-react";
// Link removed (not used)
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * V2 Basic Mode Landing Page - Streamlined yield optimization
 * Inspired by ARMA's simple approach: Connect → Top-up → Auto-invest
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
      // User is authenticated and has agent wallet, show top-up modal
      setShowTopUpModal(true);
    }
  };

  const handleTopUpSuccess = (amount: string, token: string) => {
    setShowTopUpModal(false);
    setLastTopUpAmount(amount);
    setLastTopUpToken(token);
    // Trigger auto investment flow
    setIsAutoInvestOpen(true);
  };

  const handleInvestmentComplete = (success: boolean) => {
    if (success) {
      // Redirect to dashboard after successful investment
      router.push("/pro/dashboard");
    }
  };

  const getConnectionStatus = () => {
    if (!authenticated) return "Connect Wallet";
    if (activeWalletStatus === "loading") return "Setting up your vault...";
    if (activeWalletStatus === "connected") return "Top Up & Invest";
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
                <Zap size={16} />
                <span>Intelligent Yield Optimization</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Still farming manually,{" "}
                <span className="gradient-text">anon?</span>
              </h1>

              <p className="text-xl text-gray-600 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Welcome to the era of intelligent yield optimization. Connect
                your wallet, top up, and let our AI automatically invest in the
                best Morpho vaults.
              </p>

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
                          ? "Top Up & Invest"
                          : "Get Started"}
                      </span>
                      <ArrowRight size={20} />
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Right: Protocols Showcase */}
            <div className="w-full lg:w-auto max-w-sm lg:max-w-none">
              <aside className="grid gap-4">
                {[
                  {
                    name: "Morpho",
                    apy: 13.32,
                    logo: "/protocol/Morpho.svg",
                    logoSize: 28,
                  },
                  {
                    name: "Seamless",
                    apy: 9.61,
                    logo: "/protocol/seamless.svg",
                    logoSize: 28,
                    addSpacing: true,
                  },
                  {
                    name: "Moonwell",
                    apy: 5.04,
                    logo: "/protocol/moonwell.svg",
                    logoSize: 32,
                    addSpacing: true,
                  },
                  {
                    name: "Aave",
                    apy: 4.79,
                    logo: "/protocol/aave.svg",
                    logoSize: 32,
                  },
                  {
                    name: "Wasabi",
                    apy: 4.44,
                    logo: "/protocol/wasabi.svg",
                    logoSize: 28,
                  },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={p.logo}
                        alt={p.name}
                        width={p.logoSize}
                        height={p.logoSize}
                        className="rounded-full object-contain"
                      />
                      <span
                        className={`text-sm font-medium text-gray-900 ${
                          p.addSpacing ? "mr-4" : ""
                        }`}
                      >
                        {p.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-primary-600">
                      {p.apy}%
                    </span>
                  </div>
                ))}
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
