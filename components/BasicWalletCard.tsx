"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, ExternalLink, Wallet, TrendingUp } from 'lucide-react';
import { useUnifiedWallet } from '@/lib/hooks/useUnifiedWallet';
import { toast } from 'sonner';
import { BasicWalletCardProps } from "@/lib/types"

export function BasicWalletCard({ onUpgrade, showUpgradeOption = true }: BasicWalletCardProps) {
  const {
    walletMode,
    basicWallet,
    userWalletAddress,
    isLoading
  } = useUnifiedWallet();

  const basicWalletAddress = basicWallet.address;
  const basicWalletStatus = basicWallet.status;

  const [balance, setBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Fetch wallet balance
  const fetchBalance = async () => {
    if (!userWalletAddress || !basicWalletAddress) return;

    setIsLoadingBalance(true);
    try {
      const response = await fetch(
        `/api/agent-wallet/balance?userWalletAddress=${encodeURIComponent(userWalletAddress)}&chainId=1`
      );

      if (response.ok) {
        const data = await response.json();
        setBalance(data.data.balanceFormatted);
      } else {
        console.error('Failed to fetch balance');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (basicWalletStatus === 'connected' && basicWalletAddress) {
      fetchBalance();
    }
  }, [basicWalletStatus, basicWalletAddress, userWalletAddress]);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const handleUpgrade = async () => {
    if (!onUpgrade) return;

    setIsUpgrading(true);
    try {
      await onUpgrade();
      toast.success('Successfully upgraded to Pro!');
    } catch (error) {
      toast.error('Failed to upgrade to Pro');
      console.error('Upgrade error:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  const openInExplorer = (address: string) => {
    window.open(`https://etherscan.io/address/${address}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading wallet...</span>
        </CardContent>
      </Card>
    );
  }

  if (walletMode !== 'basic' || !basicWalletAddress) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <CardTitle>Basic Agent Wallet</CardTitle>
          </div>
          <Badge variant="secondary">Basic Tier</Badge>
        </div>
        <CardDescription>
          Your simplified agent wallet for automated yield optimization
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Agent Wallet Address</label>
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <code className="flex-1 text-sm font-mono truncate">
              {basicWalletAddress}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyAddress(basicWalletAddress)}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openInExplorer(basicWalletAddress)}
              className="h-8 w-8 p-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Balance */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Balance</label>
          <div className="flex items-center space-x-2">
            {isLoadingBalance ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-2xl font-bold">{parseFloat(balance).toFixed(4)} ETH</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchBalance}
              disabled={isLoadingBalance}
              className="h-8 w-8 p-0"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Status</label>
          <div className="flex items-center space-x-2">
            {basicWalletStatus === 'connected' ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                Active
              </Badge>
            ) : basicWalletStatus === 'loading' ? (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Setting up...
              </Badge>
            ) : (
              <Badge variant="destructive">Error</Badge>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Features</label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Auto-invest</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Low gas fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Simple interface</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-gray-500">Advanced strategies</span>
            </div>
          </div>
        </div>

        {/* Upgrade Option */}
        {showUpgradeOption && onUpgrade && (
          <div className="pt-4 border-t">
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Want more advanced features? Upgrade to Pro for:
              </div>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Custom investment strategies</li>
                <li>• Advanced portfolio analytics</li>
                <li>• Smart contract wallet features</li>
                <li>• Priority support</li>
              </ul>
              <Button
                disabled
                className="w-full opacity-60 cursor-not-allowed"
                variant="outline"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Upgrade to Pro</span>
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                    Coming Soon
                  </span>
                </div>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}