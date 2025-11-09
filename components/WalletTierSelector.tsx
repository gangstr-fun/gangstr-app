"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, Check } from 'lucide-react';
import { useUnifiedWallet, type WalletMode } from '@/lib/hooks/useUnifiedWallet';
import { toast } from 'sonner';

interface WalletTierSelectorProps {
  onTierChange?: (mode: WalletMode) => void;
}

export function WalletTierSelector({ onTierChange }: WalletTierSelectorProps) {
  const {
    walletMode,
    proWallet,
    isLoading
  } = useUnifiedWallet();
  
  const proWalletStatus = proWallet.status;


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
        <h3 className="text-lg font-semibold">Pro Wallet</h3>
        <p className="text-sm text-gray-600">
          Advanced smart contract wallet with enhanced features
        </p>
      </div>

      <div className="grid md:grid-cols-1 gap-4">
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
              <h4 className="font-medium text-sm">Features included:</h4>
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
                <Settings className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Current Tier: Pro</span>
              </div>
              <Badge variant="default">
                Pro
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}