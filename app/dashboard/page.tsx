"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import TopUpModal from "@/components/TopUpModal";
import AutoInvestFlow from "@/components/AutoInvestFlow";
import InvestmentOverview from "@/components/InvestmentOverview";
import { ArrowUpRight, TrendingUp, Wallet, Settings, Plus, ExternalLink, Zap, Shield, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * V2 Basic Mode Dashboard - Simple yield optimization interface
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
    currentVault: "Loading...",
    apy: "0.0%",
    dailyEarnings: "0.00",
    totalEarnings: "0.00",
    riskLevel: "Low" as 'Low' | 'Medium' | 'High',
    isLoading: true
  });
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Fetch real vault data from API
  useEffect(() => {
    const fetchVaultData = async () => {
      if (!activeWalletAddress) {
        setVaultData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await fetch(`/api/vault/status?userWalletAddress=${activeWalletAddress}&limit=1`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch vault data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
          throw new Error('Invalid response format');
        }
        
        const { vaults, summary } = data.data;
        
        // Find the primary vault (highest allocation or first active vault)
        const primaryVault = vaults.find((vault: any) => vault.userInvestment) || vaults[0];
        
        if (primaryVault) {
          const metrics = primaryVault.metrics;
          const investment = primaryVault.userInvestment;
          
          // Calculate risk level
          let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
          if (primaryVault.riskScore <= 30) riskLevel = 'Low';
          else if (primaryVault.riskScore >= 70) riskLevel = 'High';
          
          // Calculate daily earnings estimate
          const dailyEarnings = metrics?.dailyNetApy && investment
            ? (investment.currentValue * metrics.dailyNetApy / 100) / 365
            : 0;
          
          setVaultData({
            balance: summary.userTotalInvested?.toFixed(2) || "0.00",
            currentVault: primaryVault.name || "No Active Vault",
            apy: metrics?.netApy ? `${(metrics.netApy * 100).toFixed(1)}%` : "0.0%",
            dailyEarnings: dailyEarnings.toFixed(2),
            totalEarnings: investment ? (investment.unrealizedPnl + investment.realizedPnl).toFixed(2) : "0.00",
            riskLevel,
            isLoading: false
          });
        } else {
          // No vaults found
          setVaultData({
            balance: "0.00",
            currentVault: "No Active Vault",
            apy: "0.0%",
            dailyEarnings: "0.00",
            totalEarnings: "0.00",
            riskLevel: 'Low',
            isLoading: false
          });
        }
        
        console.log('[DASHBOARD] Loaded vault data:', {
          primaryVault: primaryVault?.name,
          totalInvested: summary.userTotalInvested,
          vaultCount: vaults.length
        });
        
      } catch (error) {
        console.error('[DASHBOARD] Error fetching vault data:', error);
        
        setVaultData({
          balance: "0.00",
          currentVault: "Error Loading",
          apy: "0.0%",
          dailyEarnings: "0.00",
          totalEarnings: "0.00",
          riskLevel: 'Low',
          isLoading: false
        });
      }
    };

    fetchVaultData();
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back{user?.email ? `, ${String(user.email).split('@')[0]}` : ''}!
            </h1>
            <p className="text-gray-600">
              Your funds are automatically optimized across the best Morpho vaults.
            </p>
          </div>

          {/* Investment Overview */}
          <InvestmentOverview className="mb-8" onAddFunds={handleTopUp} />

          {/* Current Investment */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Investment</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{vaultData.currentVault}</h3>
                    <p className="text-sm text-gray-600">
                      Automatically selected for optimal yield
                    </p>
                  </div>
                </div>
                <div className="text-right">
                    {vaultData.isLoading ? (
                      <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </div>
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-green-500">{vaultData.apy}</div>
                        <div className="text-xs text-gray-600">APY</div>
                      </>
                    )}
                  </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Strategy:</span>
                  <span className="text-gray-900">Auto-compound daily</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Risk Level:</span>
                  <span className={`${
                    vaultData.riskLevel === 'Low' ? 'text-green-500' :
                    vaultData.riskLevel === 'Medium' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>{vaultData.riskLevel}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Next Update:</span>
                  <span className="text-gray-900">Tomorrow 12:00 UTC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          {parseFloat(vaultData.balance) === 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="text-primary" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ready to start earning?
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Top up your vault with USDC or WETH and we&apos;ll automatically invest it in the best performing Morpho vault.
                </p>
                <Button
                  onClick={handleTopUp}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8"
                >
                  <Plus size={20} className="mr-2" />
                  Add Funds
                </Button>
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