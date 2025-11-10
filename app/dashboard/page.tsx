"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import TopUpModal from "@/components/TopUpModal";
import AutoInvestFlow from "@/components/AutoInvestFlow";
import { ArrowUpRight, TrendingUp, Wallet, Settings, Plus, ExternalLink, Zap, Shield, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * Pro Dashboard - Yield optimization interface
 * Shows wallet balance, current vault, and easy top-up
 */
export default function DashboardPage() {
  const { authenticated, user, logout } = usePrivy();
  const { activeWalletAddress, activeWalletStatus, walletMode } = useUnifiedWallet();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isAutoInvestModalOpen, setIsAutoInvestModalOpen] = useState(false);
  const [lastTopUpAmount, setLastTopUpAmount] = useState<string>("");
  const [lastTopUpToken, setLastTopUpToken] = useState<string>("");
  const [vaultData, setVaultData] = useState({
    balance: "0.00",
    currentVault: "Morpho USDC Vault",
    apy: "12.5%",
    dailyEarnings: "0.00",
    totalEarnings: "0.00"
  });
  const router = useRouter();

  // Mock data - will be replaced with real API calls
  useEffect(() => {
    // TODO: Fetch real vault data from API
    // This would call /api/vault/status or similar
  }, [activeWalletAddress]);

  const handleTopUp = () => {
    setIsTopUpModalOpen(true);
  };

  const handleTopUpSuccess = (amount: string, token: string) => {
    setIsTopUpModalOpen(false);
    setLastTopUpAmount(amount);
    setLastTopUpToken(token);
    // Trigger auto investment flow
    setIsAutoInvestModalOpen(true);
  };

  const handleInvestmentComplete = (success: boolean) => {
    if (success) {
      // TODO: Refresh vault balance and portfolio data
      console.log('Investment completed successfully');
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-primary)]">
        <div className="terminal-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              Welcome back{user?.email ? `, ${String(user.email).split('@')[0]}` : ''}!
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Your funds are automatically optimized across the best Morpho vaults.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Balance */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_8px_rgba(0,255,149,0.02)] hover:bg-[var(--color-bg-highlight)] hover:border-[var(--color-accent-primary)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_16px_rgba(0,255,149,0.04)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden terminal-grid">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Total Balance</span>
                  <TrendingUp size={16} className="text-[var(--color-alert-green)]" />
                </div>
                <div className="text-2xl font-bold text-[var(--color-accent-primary)] font-mono font-variant-numeric-tabular">
                  ${vaultData.balance}
                </div>
                <div className="text-xs text-[var(--color-alert-green)] mt-1 font-mono font-variant-numeric-tabular">
                  +${vaultData.dailyEarnings} today
                </div>
              </div>
            </div>

            {/* Current APY */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_8px_rgba(0,255,149,0.02)] hover:bg-[var(--color-bg-highlight)] hover:border-[var(--color-accent-primary)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_16px_rgba(0,255,149,0.04)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden terminal-grid">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Current APY</span>
                  <div className="w-2 h-2 bg-[var(--color-alert-green)] rounded-full glow-soft"></div>
                </div>
                <div className="text-2xl font-bold text-[var(--color-accent-primary)] font-mono font-variant-numeric-tabular">
                  {vaultData.apy}
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] mt-1 uppercase tracking-wider">
                  Auto-optimized
                </div>
              </div>
            </div>

            {/* Total Earnings */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_8px_rgba(0,255,149,0.02)] hover:bg-[var(--color-bg-highlight)] hover:border-[var(--color-accent-primary)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_16px_rgba(0,255,149,0.04)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden terminal-grid">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Total Earnings</span>
                  <ArrowUpRight size={16} className="text-[var(--color-accent-primary)]" />
                </div>
                <div className="text-2xl font-bold text-[var(--color-accent-primary)] font-mono font-variant-numeric-tabular">
                  ${vaultData.totalEarnings}
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] mt-1 uppercase tracking-wider">
                  All time
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_8px_rgba(0,255,149,0.02)] hover:bg-[var(--color-bg-highlight)] hover:border-[var(--color-accent-primary)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_16px_rgba(0,255,149,0.04)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden terminal-grid">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Quick Actions</span>
                </div>
                <Button
                  onClick={handleTopUp}
                  className="w-full mt-2 uppercase tracking-wider"
                  size="sm"
                >
                  <Plus size={16} className="mr-2" />
                  Top Up
                </Button>
              </div>
            </div>
          </div>

          {/* Current Investment */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wider">Current Investment</h2>
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_8px_rgba(0,255,149,0.02)] hover:bg-[var(--color-bg-highlight)] hover:border-[var(--color-accent-primary)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_16px_rgba(0,255,149,0.04)] transition-all duration-200 relative overflow-hidden terminal-grid">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[var(--color-bg-highlight)] rounded-lg flex items-center justify-center border border-[var(--color-border)]">
                      <TrendingUp className="text-[var(--color-accent-primary)]" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--color-text-primary)]">{vaultData.currentVault}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Automatically selected for optimal yield
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-[var(--color-alert-green)] font-mono font-variant-numeric-tabular">{vaultData.apy}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">APY</div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)] uppercase tracking-wider">Strategy:</span>
                    <span className="text-[var(--color-text-primary)]">Auto-compound daily</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[var(--color-text-secondary)] uppercase tracking-wider">Risk Level:</span>
                    <span className="text-[var(--color-alert-green)]">Low</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[var(--color-text-secondary)] uppercase tracking-wider">Next Update:</span>
                    <span className="text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">Tomorrow 12:00 UTC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          {parseFloat(vaultData.balance) === 0 && (
            <div className="mb-8">
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_8px_rgba(0,255,149,0.02)] relative overflow-hidden terminal-grid">
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[var(--color-bg-highlight)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
                    <Wallet className="text-[var(--color-accent-primary)]" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wider">
                    Ready to start earning?
                  </h3>
                  <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
                    Top up your vault with USDC or WETH and we&apos;ll automatically invest it in the best performing Morpho vault.
                  </p>
                  <Button
                    onClick={handleTopUp}
                    size="lg"
                    className="uppercase tracking-wider px-8"
                  >
                    <Plus size={20} className="mr-2" />
                    Add Funds
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
      />
      <AutoInvestFlow
        isOpen={isAutoInvestModalOpen}
        onClose={() => setIsAutoInvestModalOpen(false)}
        amount={lastTopUpAmount}
        token={lastTopUpToken}
        onInvestmentComplete={handleInvestmentComplete}
      />
    </div>
  );
}