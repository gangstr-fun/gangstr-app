"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Clock, ArrowUpRight } from 'lucide-react';
import { useUnifiedWallet } from '@/lib/hooks/useUnifiedWallet';

interface VaultPosition {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  usdValue: number;
  apy: number;
  allocation: number;
  earnings24h: number;
  totalEarnings: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  protocol: string;
}

interface InvestmentOverviewProps {
  className?: string;
  onAddFunds?: () => void;
}

const InvestmentOverview: React.FC<InvestmentOverviewProps> = ({ className, onAddFunds }) => {
  const { activeWalletAddress } = useUnifiedWallet();
  const [positions, setPositions] = useState<VaultPosition[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalEarnings24h, setTotalEarnings24h] = useState(0);
  const [averageApy, setAverageApy] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real vault data from API
  useEffect(() => {
    const fetchPositions = async () => {
      if (!activeWalletAddress) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/vault/status?userWalletAddress=${activeWalletAddress}&limit=20`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch vault data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
          throw new Error('Invalid response format');
        }
        
        const { vaults, summary } = data.data;
        
        // Transform vault data to position format
        const vaultPositions: VaultPosition[] = vaults
          .filter((vault: any) => vault.userInvestment) // Only show vaults user has invested in
          .map((vault: any) => {
            const investment = vault.userInvestment;
            const metrics = vault.metrics;
            
            // Calculate risk level based on risk score
            let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
            if (vault.riskScore <= 30) riskLevel = 'Low';
            else if (vault.riskScore >= 70) riskLevel = 'High';
            
            // Calculate allocation percentage
            const allocation = summary.userTotalInvested > 0 
              ? (investment.currentValue / summary.userTotalInvested) * 100 
              : 0;
            
            // Estimate daily earnings based on APY
            const dailyEarnings = metrics?.dailyNetApy 
              ? (investment.currentValue * metrics.dailyNetApy / 100) / 365
              : 0;
            
            return {
              id: vault.id,
              name: vault.name,
              symbol: vault.symbol,
              balance: parseFloat(investment.currentShares) || 0,
              usdValue: investment.currentValue,
              apy: metrics?.netApy || 0,
              allocation: Math.round(allocation * 100) / 100,
              earnings24h: dailyEarnings,
              totalEarnings: investment.unrealizedPnl + investment.realizedPnl,
              riskLevel,
              protocol: 'Morpho'
            };
          });
        
        setPositions(vaultPositions);
        
        // Calculate totals from actual data
        const totalValue = summary.userTotalInvested || 0;
        const totalEarnings = vaultPositions.reduce((sum, pos) => sum + pos.totalEarnings, 0);
        const totalEarnings24h = vaultPositions.reduce((sum, pos) => sum + pos.earnings24h, 0);
        const weightedApy = vaultPositions.length > 0 
          ? vaultPositions.reduce((sum, pos) => sum + (pos.apy * pos.allocation / 100), 0)
          : summary.averageApy || 0;
        
        setTotalValue(totalValue);
        setTotalEarnings(totalEarnings);
        setTotalEarnings24h(totalEarnings24h);
        setAverageApy(weightedApy);
        
        console.log('[INVESTMENT OVERVIEW] Loaded positions:', {
          positionCount: vaultPositions.length,
          totalValue,
          totalEarnings,
          averageApy: weightedApy
        });
        
      } catch (error) {
        console.error('[INVESTMENT OVERVIEW] Error fetching positions:', error);
        
        // Set empty state on error
        setPositions([]);
        setTotalValue(0);
        setTotalEarnings(0);
        setTotalEarnings24h(0);
        setAverageApy(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPositions();
  }, [activeWalletAddress]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeWalletAddress) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
          <p className="text-muted-foreground">Connect your wallet to view your investment positions</p>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by depositing funds to automatically invest in optimized DeFi vaults
          </p>
          <Button onClick={onAddFunds}>Add Funds</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average APY</p>
                <p className="text-2xl font-bold text-green-600">{averageApy.toFixed(2)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  +${totalEarnings.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  +${totalEarnings24h.toFixed(2)} (24h)
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Your Positions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {positions.map((position) => (
              <div key={position.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {position.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{position.name}</h4>
                      <p className="text-sm text-muted-foreground">{position.protocol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${position.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm text-muted-foreground">
                      {position.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })} {position.symbol}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">APY</p>
                    <p className="font-semibold text-green-600">{position.apy}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Allocation</p>
                    <p className="font-semibold">{position.allocation}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">24h Earnings</p>
                    <p className="font-semibold text-green-600">+${position.earnings24h.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Earnings</p>
                    <p className="font-semibold text-green-600">+${position.totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskColor(position.riskLevel)}>
                      {position.riskLevel} Risk
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Daily rebalancing</span>
                    </div>
                  </div>
                  <Progress value={position.allocation} className="w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentOverview;