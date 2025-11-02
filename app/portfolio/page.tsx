"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import TopUpModal from "@/components/TopUpModal";
import AutoInvestFlow from "@/components/AutoInvestFlow";
import { ArrowUpRight, TrendingUp, Wallet, Plus, PieChart, DollarSign, Activity, Clock, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Basic Mode Portfolio Page - Simple portfolio overview
 * Shows current vault allocation, balance, and performance
 */
export default function PortfolioPage() {
  const { authenticated, user } = usePrivy();
  const { activeWalletAddress, activeWalletStatus, walletMode } = useUnifiedWallet();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isAutoInvestModalOpen, setIsAutoInvestModalOpen] = useState(false);
  const [lastTopUpAmount, setLastTopUpAmount] = useState<string>("");
  const [lastTopUpToken, setLastTopUpToken] = useState<string>("");
  const [portfolioData, setPortfolioData] = useState({
    totalBalance: "0.00",
    totalInvested: "0.00",
    currentVault: "Loading...",
    apy: "0.0%",
    dailyEarnings: "0.00",
    totalEarnings: "0.00",
    riskLevel: "Low" as 'Low' | 'Medium' | 'High',
    allocation: {
      usdc: 0,
      weth: 0,
      other: 0
    },
    performance: {
      today: 0,
      week: 0,
      month: 0
    },
    isLoading: true
  });
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Fetch portfolio data from API
  const fetchPortfolioData = useCallback(async () => {
    if (!activeWalletAddress) {
      setPortfolioData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await fetch(`/api/vault/status?userWalletAddress=${activeWalletAddress}&limit=1`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response format');
      }
      
      const { vaults, summary } = data.data;
      
      // Find the primary vault
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
          ? (investment.currentValue * metrics.dailyNetApy / 100)
          : 0;
        
        // Mock allocation data (in a real app, this would come from the API)
        const allocation = {
          usdc: 60,
          weth: 35,
          other: 5
        };
        
        // Mock performance data
        const performance = {
          today: investment ? (investment.unrealizedPnl * 0.1) : 0,
          week: investment ? (investment.unrealizedPnl * 0.4) : 0,
          month: investment ? investment.unrealizedPnl : 0
        };
        
        setPortfolioData({
          totalBalance: summary.userTotalValue?.toFixed(2) || "0.00",
          totalInvested: summary.userTotalInvested?.toFixed(2) || "0.00",
          currentVault: primaryVault.name || "No Active Vault",
          apy: metrics?.netApy ? `${(metrics.netApy * 100).toFixed(1)}%` : "0.0%",
          dailyEarnings: dailyEarnings.toFixed(2),
          totalEarnings: investment ? (investment.unrealizedPnl + investment.realizedPnl).toFixed(2) : "0.00",
          riskLevel,
          allocation,
          performance,
          isLoading: false
        });
      } else {
        // No vaults found
        setPortfolioData({
          totalBalance: "0.00",
          totalInvested: "0.00",
          currentVault: "No Active Vault",
          apy: "0.0%",
          dailyEarnings: "0.00",
          totalEarnings: "0.00",
          riskLevel: 'Low',
          allocation: { usdc: 0, weth: 0, other: 0 },
          performance: { today: 0, week: 0, month: 0 },
          isLoading: false
        });
      }
      
    } catch (error) {
      console.error('[PORTFOLIO] Error fetching portfolio data:', error);
      
      setPortfolioData({
        totalBalance: "0.00",
        totalInvested: "0.00",
        currentVault: "Error Loading",
        apy: "0.0%",
        dailyEarnings: "0.00",
        totalEarnings: "0.00",
        riskLevel: 'Low',
        allocation: { usdc: 0, weth: 0, other: 0 },
        performance: { today: 0, week: 0, month: 0 },
        isLoading: false
      });
    }
  }, [activeWalletAddress]);

  useEffect(() => {
    fetchPortfolioData();
  }, [activeWalletAddress, fetchPortfolioData]);

  const handleTopUp = () => {
    setIsTopUpModalOpen(true);
  };

  const handleTopUpSuccess = (amount: string, token: string) => {
    setIsTopUpModalOpen(false);
    setLastTopUpAmount(amount);
    setLastTopUpToken(token);
    setIsAutoInvestModalOpen(true);
  };

  const handleInvestmentComplete = async (success: boolean) => {
    if (success) {
      console.log('Investment completed successfully');
      // Refresh portfolio data
      await fetchPortfolioData();
    }
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Portfolio
            </h1>
            <p className="text-gray-600">
              Track your investments and earnings across Morpho vaults.
            </p>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Balance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wallet className="text-primary" size={24} />
                </div>
                <Button
                  onClick={handleTopUp}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Value</p>
                {portfolioData.isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">${portfolioData.totalBalance}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Invested: ${portfolioData.totalInvested}</p>
              </div>
            </div>

            {/* Current APY */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Current APY</p>
                {portfolioData.isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-green-600">{portfolioData.apy}</p>
                )}
              </div>
            </div>

            {/* Total Earnings */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-blue-600" size={24} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                {portfolioData.isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                ) : (
                  <p className={`text-2xl font-bold ${
                    parseFloat(portfolioData.totalEarnings) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${portfolioData.totalEarnings}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Current Vault */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Investment</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Target className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{portfolioData.currentVault}</h3>
                    <p className="text-sm text-gray-600">
                      Automatically optimized for best yield
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-green-500">{portfolioData.apy}</div>
                  <div className="text-xs text-gray-600">APY</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Daily Earnings</p>
                  <p className="font-semibold text-gray-900">${portfolioData.dailyEarnings}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Risk Level</p>
                  <p className={`font-semibold ${
                    portfolioData.riskLevel === 'Low' ? 'text-green-500' :
                    portfolioData.riskLevel === 'Medium' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>{portfolioData.riskLevel}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Strategy</p>
                  <p className="font-semibold text-gray-900">Auto-compound</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Next Update</p>
                  <p className="font-semibold text-gray-900">Tomorrow</p>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Asset Allocation</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="space-y-4">
                {/* USDC */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">USDC</span>
                    </div>
                    <span className="font-medium text-gray-900">USD Coin</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{portfolioData.allocation.usdc}%</p>
                    <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                      <div 
                        className="h-2 bg-blue-500 rounded-full" 
                        style={{ width: `${portfolioData.allocation.usdc}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* WETH */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-purple-600">WETH</span>
                    </div>
                    <span className="font-medium text-gray-900">Wrapped Ethereum</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{portfolioData.allocation.weth}%</p>
                    <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                      <div 
                        className="h-2 bg-purple-500 rounded-full" 
                        style={{ width: `${portfolioData.allocation.weth}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Other */}
                {portfolioData.allocation.other > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-600">OTHER</span>
                      </div>
                      <span className="font-medium text-gray-900">Other Assets</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{portfolioData.allocation.other}%</p>
                      <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                        <div 
                          className="h-2 bg-gray-500 rounded-full" 
                          style={{ width: `${portfolioData.allocation.other}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="text-gray-400" size={20} />
                  <span className="text-sm text-gray-600">Today</span>
                </div>
                <p className={`text-xl font-bold ${
                  portfolioData.performance.today >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${portfolioData.performance.today.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="text-gray-400" size={20} />
                  <span className="text-sm text-gray-600">This Week</span>
                </div>
                <p className={`text-xl font-bold ${
                  portfolioData.performance.week >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${portfolioData.performance.week.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="text-gray-400" size={20} />
                  <span className="text-sm text-gray-600">This Month</span>
                </div>
                <p className={`text-xl font-bold ${
                  portfolioData.performance.month >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${portfolioData.performance.month.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {parseFloat(portfolioData.totalBalance) === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <PieChart className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Start Building Your Portfolio
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Add funds to your vault and watch your portfolio grow with automated yield optimization.
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
          )}
        </div>
      </main>

      {/* Modals */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        onSuccess={handleTopUpSuccess}
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