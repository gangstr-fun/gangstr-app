"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Settings, Check, ArrowRight } from 'lucide-react';
import { useUnifiedWallet, type WalletMode } from '@/lib/hooks/useUnifiedWallet';
import { toast } from 'sonner';

interface WalletTierSelectorProps {
  onTierChange?: (mode: WalletMode) => void;
}

export function WalletTierSelector({ onTierChange }: WalletTierSelectorProps) {
  const {
    walletMode,
    basicWallet,
    proWallet,
    switchMode,
    isLoading
  } = useUnifiedWallet();
  
  const basicWalletStatus = basicWallet.status;
  const proWalletStatus = proWallet.status;

  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await switchMode('pro');
      toast.success('Successfully upgraded to Pro tier!');
      onTierChange?.('pro');
    } catch (error) {
      toast.error('Failed to upgrade to Pro tier');
      console.error('Upgrade error:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading wallet tiers...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Choose Your Wallet Tier</h3>
        <p className="text-sm text-gray-600">
          Select the tier that best fits your investment needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Basic Tier */}
        <Card className={`relative transition-all duration-200 ${
          walletMode === 'basic' 
            ? 'ring-2 ring-blue-500 shadow-lg' 
            : 'hover:shadow-md'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Basic</CardTitle>
              </div>
              {walletMode === 'basic' && (
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  <Check className="h-3 w-3 mr-1" />
                  Current
                </Badge>
              )}
            </div>
            <CardDescription>
              Perfect for getting started with automated yield optimization
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold text-blue-600">Free</div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Features included:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>EOA wallet (lower gas fees)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Auto-invest in curated vaults</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Simple top-up interface</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Basic portfolio tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Community support</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  basicWalletStatus === 'connected' 
                    ? 'bg-green-500' 
                    : basicWalletStatus === 'loading'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}></div>
                <span className="text-gray-600">
                  {basicWalletStatus === 'connected' 
                    ? 'Wallet Ready' 
                    : basicWalletStatus === 'loading'
                    ? 'Setting up...'
                    : 'Setup Required'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className={`relative transition-all duration-200 ${
          walletMode === 'pro' 
            ? 'ring-2 ring-purple-500 shadow-lg' 
            : 'hover:shadow-md'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">Pro</CardTitle>
              </div>
              {walletMode === 'pro' ? (
                <Badge variant="default" className="bg-purple-100 text-purple-800">
                  <Check className="h-3 w-3 mr-1" />
                  Current
                </Badge>
              ) : (
                <Badge variant="outline" className="border-purple-200 text-purple-600">
                  Upgrade
                </Badge>
              )}
            </div>
            <CardDescription>
              Advanced features for sophisticated investors
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold text-purple-600">Free</div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Everything in Basic, plus:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Smart contract wallet (Coinbase CDP)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Custom investment strategies</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Advanced portfolio analytics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Multi-chain support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>AI agent customization</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              {walletMode === 'pro' ? (
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    proWalletStatus === 'connected' 
                      ? 'bg-green-500' 
                      : proWalletStatus === 'loading'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}></div>
                  <span className="text-gray-600">
                    {proWalletStatus === 'connected' 
                      ? 'Wallet Ready' 
                      : proWalletStatus === 'loading'
                      ? 'Setting up...'
                      : 'Setup Required'
                    }
                  </span>
                </div>
              ) : (
                <Button
                  disabled
                  className="w-full bg-gray-400 cursor-not-allowed opacity-60"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Upgrade to Pro</span>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      Coming Soon
                    </span>
                  </div>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {walletMode === 'basic' ? (
                  <Zap className="h-4 w-4 text-blue-500" />
                ) : (
                  <Settings className="h-4 w-4 text-purple-500" />
                )}
                <span className="font-medium">Current Tier: {walletMode.charAt(0).toUpperCase() + walletMode.slice(1)}</span>
              </div>
              <Badge variant={walletMode === 'basic' ? 'secondary' : 'default'}>
                {walletMode === 'basic' ? 'Basic' : 'Pro'}
              </Badge>
            </div>
            
            {walletMode === 'basic' && (
              <div className="text-sm text-gray-600">
                Ready to unlock more features?
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}