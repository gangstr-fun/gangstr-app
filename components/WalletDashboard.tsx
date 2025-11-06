"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wallet, TrendingUp, Settings, RefreshCw, ExternalLink } from 'lucide-react';
import { useUnifiedWallet } from '@/lib/hooks/useUnifiedWallet';
import { formatEther } from 'viem';
import { toast } from 'sonner';
import { WalletStats } from '@/lib/types';

export function WalletDashboard() {
  const { proWallet, userWalletAddress, isLoading, refreshWallets } = useUnifiedWallet();
  const proWalletAddress = proWallet.address;
  const proWalletStatus = proWallet.status;

  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch wallet balance and stats (Pro-only)
  const fetchWalletStats = useCallback(async () => {
    if (!proWalletAddress || !userWalletAddress) return;

    try {
      const response = await fetch(`/api/agent-wallet/balance?userWalletAddress=${encodeURIComponent(userWalletAddress)}&chainId=8453`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        const payload = data.data || data;
        setWalletStats({
          balance: payload.balance || '0',
          transactionCount: payload.transactionCount || 0,
          totalVolume: payload.totalVolume || '0',
          gasUsed: payload.gasUsed || '0'
        });
      }
    } catch (e) {
      console.error('Failed to fetch wallet stats:', e);
    }
  }, [proWalletAddress, userWalletAddress]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshWallets();
      await fetchWalletStats();
      toast.success('Wallet data refreshed');
    } catch {
      toast.error('Failed to refresh wallet data');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletStats();
  }, [fetchWalletStats]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-3 text-lg">Loading wallet dashboard...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wallet Dashboard</h2>
          <p className="text-gray-600 mt-1">Manage your Pro wallet and view performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge>Pro</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'settings')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Wallet Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {walletStats ? `${parseFloat(formatEther(BigInt(walletStats.balance))).toFixed(4)} ETH` : '0.0000 ETH'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {walletStats?.transactionCount || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {walletStats ? `${parseFloat(formatEther(BigInt(walletStats.totalVolume))).toFixed(2)} ETH` : '0.00 ETH'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Gas Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {walletStats ? `${parseFloat(formatEther(BigInt(walletStats.gasUsed))).toFixed(6)} ETH` : '0.000000 ETH'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wallet Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Wallet (Pro-only) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current Wallet</h3>
              {proWalletAddress ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5 text-purple-500" />
                        <span>Pro Wallet (Smart Contract)</span>
                      </CardTitle>
                      <Badge className="bg-purple-100 text-purple-800">Pro</Badge>
                    </div>
                    <CardDescription>
                      Advanced smart contract wallet with enhanced features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Address:</span>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {proWalletAddress.slice(0, 6)}...{proWalletAddress.slice(-4)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://basescan.org/address/${proWalletAddress}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant={proWalletStatus === 'connected' ? 'default' : 'secondary'}>
                          {proWalletStatus === 'connected' ? 'Active' : 'Setting up'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span>N/A</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center p-8">
                    <div className="text-center space-y-2">
                      <Wallet className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-gray-600">No wallet found</p>
                      <p className="text-sm text-gray-500">Please check your wallet setup</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Performance Chart Placeholder */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Portfolio Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-48 text-gray-500">
                    <div className="text-center space-y-2">
                      <TrendingUp className="h-8 w-8 mx-auto" />
                      <p>Performance chart coming soon</p>
                      <p className="text-sm">Track your investment returns over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pro Wallet</CardTitle>
              <CardDescription>Pro is the only available tier.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Your account is configured for Pro features.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}