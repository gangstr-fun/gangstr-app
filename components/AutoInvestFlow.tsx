"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";

interface AutoInvestFlowProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  token: string;
  onInvestmentComplete?: (success: boolean) => void;
}

interface VaultData {
  address: string;
  name: string;
  apy: number;
  tvl: number;
  riskScore: string;
}

const AutoInvestFlow: React.FC<AutoInvestFlowProps> = ({
  isOpen,
  onClose,
  amount,
  token,
  onInvestmentComplete,
}) => {
  const [step, setStep] = useState<'analyzing' | 'investing' | 'success' | 'error'>('analyzing');
  const [selectedVault, setSelectedVault] = useState<VaultData | null>(null);
  const [error, setError] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string>("");
  const { activeWalletAddress, walletMode } = useUnifiedWallet();

  useEffect(() => {
    if (isOpen && amount && token) {
      startAutoInvestment();
    }
  }, [isOpen, amount, token]);

  const startAutoInvestment = async () => {
    try {
      setStep('analyzing');
      setError("");

      // Step 1: Analyze and select best vault
      const response = await fetch('/api/vault/invest', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vault data');
      }

      const data = await response.json();
      const bestVault = data.bestVault;

      if (!bestVault) {
        throw new Error('No suitable vault found');
      }

      setSelectedVault(bestVault);

      // Step 2: Execute investment
      setStep('investing');

      const investResponse = await fetch('/api/vault/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          token,
          vaultAddress: bestVault.address,
        }),
      });

      if (!investResponse.ok) {
        const errorData = await investResponse.json();
        throw new Error(errorData.error || 'Investment failed');
      }

      const investData = await investResponse.json();
      setTransactionHash(investData.transactionHash || 'simulated');
      setStep('success');
      onInvestmentComplete?.(true);

    } catch (err: any) {
      console.error('Auto investment error:', err);
      setError(err.message || 'Investment failed');
      setStep('error');
      onInvestmentComplete?.(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after a delay to allow for smooth closing animation
    setTimeout(() => {
      setStep('analyzing');
      setSelectedVault(null);
      setError("");
      setTransactionHash("");
    }, 300);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'analyzing':
        return (
          <div className="flex flex-col items-center space-y-4 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Analyzing Best Vaults</h3>
              <p className="text-sm text-gray-600 mt-1">
                Finding the optimal Morpho vault for your {amount} {token}...
              </p>
            </div>
          </div>
        );

      case 'investing':
        return (
          <div className="flex flex-col items-center space-y-4 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Investing Your Funds</h3>
              <p className="text-sm text-gray-600 mt-1">
                Depositing into {selectedVault?.name}...
              </p>
              {selectedVault && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">{selectedVault.name}</div>
                    <div className="text-green-600">{selectedVault.apy.toFixed(2)}% APY</div>
                    <div className="text-gray-500">Risk: {selectedVault.riskScore}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4 py-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="text-center">
              <h3 className="font-semibold text-lg text-green-700">Investment Successful!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your {amount} {token} has been invested in {selectedVault?.name}
              </p>
              {selectedVault && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">{selectedVault.name}</div>
                    <div className="text-green-600">{selectedVault.apy.toFixed(2)}% APY</div>
                    <div className="text-gray-500">Expected daily yield: ~{((parseFloat(amount) * selectedVault.apy) / 365 / 100).toFixed(4)} {token}</div>
                  </div>
                </div>
              )}
              {transactionHash && transactionHash !== 'simulated' && (
                <div className="mt-2 text-xs text-gray-500">
                  Transaction: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </div>
              )}
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4 py-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="text-center">
              <h3 className="font-semibold text-lg text-red-700">Investment Failed</h3>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
              <Button 
                onClick={startAutoInvestment} 
                className="mt-4"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto Investment</DialogTitle>
          <DialogDescription>
            Automatically investing your funds into the best available Morpho vault
          </DialogDescription>
        </DialogHeader>
        
        {renderStepContent()}
        
        {(step === 'success' || step === 'error') && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AutoInvestFlow;