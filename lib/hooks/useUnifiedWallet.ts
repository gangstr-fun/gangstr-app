import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export type WalletMode = 'basic' | 'pro';

export interface WalletInfo {
  address: string | null;
  status: 'idle' | 'loading' | 'connected' | 'error';
  walletType: 'EOA' | 'Smart Contract';
  error?: string;
}

export interface UnifiedWalletState {
  // Current active wallet info
  activeWalletAddress: string | null;
  activeWalletStatus: 'idle' | 'loading' | 'connected' | 'error';
  activeWalletType: 'EOA' | 'Smart Contract';
  
  // Current mode
  walletMode: WalletMode;
  
  // Individual wallet info
  basicWallet: WalletInfo;
  proWallet: WalletInfo;
  
  // User wallet (Privy)
  userWalletAddress: string | null;
  userWalletStatus: 'idle' | 'loading' | 'connected' | 'error';
  
  // Actions
  switchMode: (mode: WalletMode) => void;
  ensureWallet: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * Unified wallet hook that manages both basic and pro wallets with frontend-driven mode switching
 */
export function useUnifiedWallet(): UnifiedWalletState {
  const { user, authenticated, ready } = usePrivy();
  
  // Cache to prevent duplicate API calls
  const cacheRef = useRef<{
    basicWallet: { data: WalletInfo | null; timestamp: number };
    proWallet: { data: WalletInfo | null; timestamp: number };
  }>({
    basicWallet: { data: null, timestamp: 0 },
    proWallet: { data: null, timestamp: 0 }
  });
  
  // Ref to track pending requests
  const basicWalletRequestPendingRef = useRef(false);
  
  const CACHE_DURATION = 30000; // 30 seconds cache
  
  // State management
  const [walletMode, setWalletMode] = useState<WalletMode>('basic'); // Default to basic
  const [basicWallet, setBasicWallet] = useState<WalletInfo>({
    address: null,
    status: 'idle',
    walletType: 'EOA'
  });
  const [proWallet, setProWallet] = useState<WalletInfo>({
    address: null,
    status: 'idle',
    walletType: 'Smart Contract'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Derived user wallet info
  const userWalletAddress = user?.linkedAccounts?.find(account => account.type === 'wallet')?.address || null;
  const userWalletStatus = userWalletAddress ? 'connected' : (authenticated && ready ? 'loading' : 'idle');
  
  // Derived active wallet info
  const activeWallet = walletMode === 'basic' ? basicWallet : proWallet;
  const activeWalletAddress = activeWallet.address;
  const activeWalletStatus = activeWallet.status;
  const activeWalletType = activeWallet.walletType;
  
  /**
   * Fetch basic wallet info with caching
   */
  const fetchBasicWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    // Check cache first
    const now = Date.now();
    const cached = cacheRef.current.basicWallet;
    if (cached.data && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('[BASIC WALLET API] Using cached data');
      setBasicWallet(cached.data);
      return;
    }
    
    // Prevent duplicate requests
    if (basicWalletRequestPendingRef.current) {
      console.log('[BASIC WALLET API] Request already in progress, skipping');
      return;
    }
    
    basicWalletRequestPendingRef.current = true;
    
    try {
      console.log(`[BASIC WALLET API] Fetching wallet for address: ${userWalletAddress}`);
      setBasicWallet(prev => ({ ...prev, status: 'loading' }));
      
      const response = await fetch(`/api/basic-wallet?userWalletAddress=${userWalletAddress}`);
      const data = await response.json();
      
      let walletInfo: WalletInfo;
      
      if (response.ok) {
        if (data.hasBasicWallet) {
          walletInfo = {
            address: data.basicWalletAddress,
            status: 'connected',
            walletType: 'EOA'
          };
        } else {
          walletInfo = {
            address: null,
            status: 'idle',
            walletType: 'EOA'
          };
        }
      } else {
        walletInfo = {
          address: null,
          status: 'error',
          walletType: 'EOA',
          error: data.error || 'Failed to fetch basic wallet'
        };
      }
      
      // Update cache and state
      cacheRef.current.basicWallet = { data: walletInfo, timestamp: now };
      setBasicWallet(walletInfo);
      
    } catch (err) {
      const errorWallet = {
        address: null,
        status: 'error' as const,
        walletType: 'EOA' as const,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
      
      cacheRef.current.basicWallet = { data: errorWallet, timestamp: now };
      setBasicWallet(errorWallet);
    } finally {
      basicWalletRequestPendingRef.current = false;
    }
  }, [userWalletAddress, basicWallet.status, CACHE_DURATION]);
  
  /**
   * Fetch pro wallet info
   */
  const fetchProWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    try {
      setProWallet(prev => ({ ...prev, status: 'loading' }));
      
      const response = await fetch(`/api/agent-wallet?userWalletAddress=${userWalletAddress}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.hasAgentWallet) {
          setProWallet({
            address: data.agentWalletAddress,
            status: 'connected',
            walletType: 'Smart Contract'
          });
        } else {
          setProWallet({
            address: null,
            status: 'idle',
            walletType: 'Smart Contract'
          });
        }
      } else {
        setProWallet({
          address: null,
          status: 'error',
          walletType: 'Smart Contract',
          error: data.error || 'Failed to fetch pro wallet'
        });
      }
    } catch (err) {
      setProWallet({
        address: null,
        status: 'error',
        walletType: 'Smart Contract',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }, [userWalletAddress]);
  
  /**
   * Create basic wallet
   */
  const createBasicWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    try {
      setBasicWallet(prev => ({ ...prev, status: 'loading' }));
      
      const response = await fetch('/api/basic-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWalletAddress })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBasicWallet({
          address: data.basicWalletAddress,
          status: 'connected',
          walletType: 'EOA'
        });
      } else {
        setBasicWallet({
          address: null,
          status: 'error',
          walletType: 'EOA',
          error: data.error || 'Failed to create basic wallet'
        });
      }
    } catch (err) {
      setBasicWallet({
        address: null,
        status: 'error',
        walletType: 'EOA',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }, [userWalletAddress]);
  
  /**
   * Create pro wallet
   */
  const createProWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    try {
      setProWallet(prev => ({ ...prev, status: 'loading' }));
      
      const response = await fetch('/api/agent-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWalletAddress })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProWallet({
          address: data.agentWalletAddress,
          status: 'connected',
          walletType: 'Smart Contract'
        });
      } else {
        setProWallet({
          address: null,
          status: 'error',
          walletType: 'Smart Contract',
          error: data.error || 'Failed to create pro wallet'
        });
      }
    } catch (err) {
      setProWallet({
        address: null,
        status: 'error',
        walletType: 'Smart Contract',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }, [userWalletAddress]);
  
  /**
   * Ensure the current mode's wallet exists
   */
  const ensureWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (walletMode === 'basic') {
        // Check if basic wallet exists, create if not
        await fetchBasicWallet();
        if (!basicWallet.address && basicWallet.status !== 'loading') {
          await createBasicWallet();
        }
      } else {
        // Check if pro wallet exists, create if not
        await fetchProWallet();
        if (!proWallet.address && proWallet.status !== 'loading') {
          await createProWallet();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ensure wallet');
    } finally {
      setIsLoading(false);
    }
  }, [userWalletAddress, walletMode, fetchBasicWallet, createBasicWallet, fetchProWallet, createProWallet]);
  
  /**
   * Refresh both wallets
   */
  const refreshWallets = useCallback(async () => {
    if (!userWalletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchBasicWallet(),
        fetchProWallet()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh wallets');
    } finally {
      setIsLoading(false);
    }
  }, [userWalletAddress, fetchBasicWallet, fetchProWallet]);
  
  /**
   * Switch wallet mode
   */
  const switchMode = useCallback((mode: WalletMode) => {
    setWalletMode(mode);
    setError(null);
  }, []);
  
  // Initial wallet fetch when user wallet is available (with debouncing)
  useEffect(() => {
    if (!userWalletAddress || !authenticated) return;
    
    // Only fetch if we don't have cached data or wallet info
    const hasBasicCache = cacheRef.current.basicWallet.data !== null;
    const hasProCache = cacheRef.current.proWallet.data !== null;
    
    if (!hasBasicCache || !hasProCache) {
      const timeoutId = setTimeout(() => {
        refreshWallets();
      }, 100); // Small debounce to prevent rapid calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [userWalletAddress, authenticated, refreshWallets]);
  
  // Auto-ensure wallet when mode changes (only if needed)
  useEffect(() => {
    if (!userWalletAddress || !authenticated) return;
    
    const currentWallet = walletMode === 'basic' ? basicWallet : proWallet;
    
    // Only ensure wallet if current mode wallet doesn't exist
    if (currentWallet.status === 'idle' || (currentWallet.status === 'error' && !currentWallet.address)) {
      const timeoutId = setTimeout(() => {
        ensureWallet();
      }, 200); // Debounce to prevent rapid calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [walletMode, userWalletAddress, authenticated, basicWallet.status, basicWallet.address, proWallet.status, proWallet.address, ensureWallet]);
  
  return {
    // Active wallet info
    activeWalletAddress,
    activeWalletStatus,
    activeWalletType,
    
    // Current mode
    walletMode,
    
    // Individual wallet info
    basicWallet,
    proWallet,
    
    // User wallet info
    userWalletAddress,
    userWalletStatus,
    
    // Actions
    switchMode,
    ensureWallet,
    refreshWallets,
    
    // Loading states
    isLoading,
    error
  };
}