"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Wallet,
  Settings as SettingsIcon,
  Mail,
  Eye,
  EyeOff,
  Bot,
  Search,
  Zap,
  CreditCard,
  HelpCircle,
  Palette,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { LinkedAccountWithMetadata } from "@privy-io/react-auth";
import Link from "next/link";
import Image from "next/image";

// Types for user preferences
interface UserPreferences {
  notifications?: {
    email: boolean;
    push: boolean;
    dailyReports: boolean;
    priceAlerts: boolean;
    agentUpdates: boolean;
    portfolioRebalancing: boolean;
    researchUpdates: boolean;
  };
  agentSettings?: {
    autoExecute: boolean;
    riskTolerance: string;
    maxInvestmentAmount: string;
    rebalanceFrequency: string;
    enableMarketTiming: boolean;
    stopLossThreshold: string;
  };
  automationSettings?: {
    autoRebalance: boolean;
    autoCompound: boolean;
    autoTopUp: boolean;
    topUpAmount: string;
    topUpTrigger: string;
    emergencyStop: boolean;
  };
  researchSettings?: {
    researchLevel: string;
    alerts: {
      newOpportunities: boolean;
      riskChanges: boolean;
      marketVolatility: boolean;
    };
    autoAnalysis: boolean;
    customWatchlist: string[];
  };
  theme?: string;
  currency?: string;
  language?: string;
  timezone?: string;
}

/**
 * Pro Mode Settings Page - Advanced settings with Pro-specific features
 * Includes agent configuration, automation settings, research preferences, etc.
 */
export default function ProSettingsPage() {
  const { user, logout, authenticated } = usePrivy();
  const { activeWalletAddress } = useUnifiedWallet();
  const router = useRouter();

  // Safely access user data with fallbacks
  const googleAccount = user?.linkedAccounts.find(
    (acc: LinkedAccountWithMetadata) => acc.type === "google_oauth"
  );
  const githubAccount = user?.linkedAccounts.find(
    (acc: LinkedAccountWithMetadata) => acc.type === "github_oauth"
  );

  const name =
    (googleAccount as any)?.name ||
    (githubAccount as any)?.name ||
    user?.wallet?.address ||
    "User";
  const email =
    (googleAccount as any)?.email || (githubAccount as any)?.email || "";
  const profilePictureUrl =
    (googleAccount as any)?.profile_picture_url ||
    (githubAccount as any)?.profile_picture_url ||
    null;

  // Profile Settings
  const [userName, setUserName] = useState(name);
  const [showWalletAddress, setShowWalletAddress] = useState(false);

  // Notification Settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    dailyReports: true,
    priceAlerts: true,
    agentUpdates: true,
    portfolioRebalancing: true,
    researchUpdates: false,
  });

  // Pro-specific Settings
  const [agentSettings, setAgentSettings] = useState({
    autoExecute: false,
    riskTolerance: "medium",
    maxInvestmentAmount: "1000",
    rebalanceFrequency: "daily",
    enableMarketTiming: false,
    stopLossThreshold: "5",
  });

  const [automationSettings, setAutomationSettings] = useState({
    autoRebalance: true,
    autoCompound: true,
    autoTopUp: false,
    topUpAmount: "100",
    topUpTrigger: "monthly",
    emergencyStop: true,
  });

  const [researchSettings, setResearchSettings] = useState({
    researchLevel: "advanced",
    alerts: {
      newOpportunities: true,
      riskChanges: true,
      marketVolatility: false,
    },
    autoAnalysis: true,
    customWatchlist: [] as string[],
  });

  const [theme, setTheme] = useState("dark");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    userWalletAddress: string;
    basicWalletId?: string;
    proWalletId?: string;
    basicWalletAddress?: string;
    proWalletAddress?: string;
    riskProfile: string;
    otherUserInfo: string;
    preferences?: UserPreferences;
    createdAt: string;
    updatedAt: string;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push("/");
    }
  }, [authenticated, router]);

  // Load user profile and settings
  useEffect(() => {
    loadUserSettings();
  }, [activeWalletAddress]);

  // Update userName when user data changes
  useEffect(() => {
    setUserName(name);
  }, [name]);

  const loadUserSettings = async () => {
    if (!activeWalletAddress) return;

    try {
      setIsLoading(true);

      // First try to get existing profile
      const response = await fetch(
        `/api/user/profile?walletAddress=${activeWalletAddress}`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.data);

        // Load preferences from API response data
        if (data.data?.preferences) {
          const prefs: UserPreferences = data.data.preferences;

          // Update notification settings
          if (prefs.notifications) {
            setNotifications((prev) => ({ ...prev, ...prefs.notifications }));
          }

          // Update agent settings
          if (prefs.agentSettings) {
            setAgentSettings((prev) => ({ ...prev, ...prefs.agentSettings }));
          }

          // Update automation settings
          if (prefs.automationSettings) {
            setAutomationSettings((prev) => ({
              ...prev,
              ...prefs.automationSettings,
            }));
          }

          // Update research settings
          if (prefs.researchSettings) {
            setResearchSettings((prev) => ({
              ...prev,
              ...prefs.researchSettings,
            }));
          }

          // Update system settings
          if (prefs.theme) setTheme(prefs.theme);
          if (prefs.currency) setCurrency(prefs.currency);
          if (prefs.language) setLanguage(prefs.language);
          if (prefs.timezone) setTimezone(prefs.timezone);
        }
      } else if (response.status === 404) {
        // Profile doesn't exist, create it with default values
        const createResponse = await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: activeWalletAddress,
            riskProfile: "medium",
            preferences: {
              notifications,
              agentSettings,
              automationSettings,
              researchSettings,
              theme,
              currency,
              language,
              timezone,
            },
          }),
        });

        if (createResponse.ok) {
          const data = await createResponse.json();
          setUserProfile(data.data);
        }
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (section: string, settings?: any) => {
    if (!activeWalletAddress) {
      toast.error("Wallet not connected");
      return;
    }

    try {
      setIsLoading(true);

      // Prepare settings data
      const allSettings: UserPreferences = {
        notifications,
        agentSettings,
        automationSettings,
        researchSettings,
        theme,
        currency,
        language,
        timezone,
        ...settings,
      };

      // First ensure user profile exists
      const profileResponse = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: activeWalletAddress,
          riskProfile: agentSettings.riskTolerance,
          preferences: allSettings,
        }),
      });

      if (profileResponse.ok) {
        toast.success(`${section} settings saved successfully!`);
        // Reload settings to ensure UI is in sync
        await loadUserSettings();
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(`Failed to save ${section} settings. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return "";
    return showWalletAddress
      ? address
      : `${address.slice(0, 6)}...${address.slice(-4)}`;
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
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/pro" className="text-gray-500 hover:text-gray-700">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pro Settings</h1>
              <p className="text-gray-600">
                Configure your professional trading experience
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-8">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid bg-white border border-gray-200">
              <TabsTrigger
                value="profile"
                className="flex items-center space-x-2"
              >
                <User size={16} />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="agent"
                className="flex items-center space-x-2"
              >
                <Image src="/new-logo.svg" alt="Agent" width={16} height={16} />
                <span className="hidden sm:inline">Agent</span>
              </TabsTrigger>
              <TabsTrigger
                value="automation"
                className="flex items-center space-x-2"
              >
                <Zap size={16} />
                <span className="hidden sm:inline">Automation</span>
              </TabsTrigger>
              <TabsTrigger
                value="research"
                className="flex items-center space-x-2"
              >
                <Search size={16} />
                <span className="hidden sm:inline">Research</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center space-x-2"
              >
                <Bell size={16} />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="flex items-center space-x-2"
              >
                <SettingsIcon size={16} />
                <span className="hidden sm:inline">System</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <User className="text-primary" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Profile Information
                    </h2>
                    <p className="text-gray-600">
                      Update your personal details and wallet information
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Profile Picture and Name */}
                  <div className="flex items-center space-x-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={profilePictureUrl} alt={userName} />
                      <AvatarFallback className="text-lg font-semibold">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-gray-700"
                      >
                        Display Name
                      </Label>
                      <Input
                        id="name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="mt-1 max-w-md"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </Label>
                    <div className="mt-1 flex items-center space-x-3">
                      <Mail className="text-gray-400" size={20} />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        className="max-w-md"
                        disabled
                        placeholder="No email connected"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Email is managed through your connected account
                    </p>
                  </div>

                  {/* Wallet Address */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Active Wallet Address
                    </Label>
                    <div className="mt-1 flex items-center space-x-3">
                      <Wallet className="text-gray-400" size={20} />
                      <div className="flex items-center space-x-2 flex-1">
                        <Input
                          value={formatWalletAddress(activeWalletAddress || "")}
                          className="max-w-md font-mono text-sm"
                          disabled
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowWalletAddress(!showWalletAddress)
                          }
                        >
                          {showWalletAddress ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSave("Profile")}
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {isLoading ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </GlassPanel>
            </TabsContent>

            {/* Agent Configuration Tab */}
            <TabsContent value="agent" className="space-y-6">
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Image
                      src="/new-logo.svg"
                      alt="AI Agent"
                      width={24}
                      height={24}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      AI Agent Configuration
                    </h2>
                    <p className="text-gray-600">
                      Fine-tune your AI agent&apos;s behavior and risk
                      parameters
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Risk Tolerance */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-3 block">
                        Risk Tolerance
                      </Label>
                      <Select
                        value={agentSettings.riskTolerance}
                        onValueChange={(value) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            riskTolerance: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">
                            Conservative
                          </SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                          <SelectItem value="high-risk">High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Max Investment Amount */}
                    <div>
                      <Label
                        htmlFor="maxInvestment"
                        className="text-sm font-medium text-gray-900"
                      >
                        Max Investment Amount (USD)
                      </Label>
                      <Input
                        id="maxInvestment"
                        type="number"
                        value={agentSettings.maxInvestmentAmount}
                        onChange={(e) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            maxInvestmentAmount: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder="1000"
                      />
                    </div>

                    {/* Rebalance Frequency */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-3 block">
                        Rebalancing Frequency
                      </Label>
                      <Select
                        value={agentSettings.rebalanceFrequency}
                        onValueChange={(value) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            rebalanceFrequency: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stop Loss Threshold */}
                    <div>
                      <Label
                        htmlFor="stopLoss"
                        className="text-sm font-medium text-gray-900"
                      >
                        Stop Loss Threshold (%)
                      </Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        value={agentSettings.stopLossThreshold}
                        onChange={(e) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            stopLossThreshold: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Auto Execute */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Auto-Execute Trades
                        </Label>
                        <p className="text-sm text-gray-600">
                          Allow the agent to automatically execute trades
                          without confirmation
                        </p>
                      </div>
                      <Switch
                        checked={agentSettings.autoExecute}
                        onCheckedChange={(checked) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            autoExecute: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Market Timing */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Enable Market Timing
                        </Label>
                        <p className="text-sm text-gray-600">
                          Use advanced algorithms to time market entries and
                          exits
                        </p>
                      </div>
                      <Switch
                        checked={agentSettings.enableMarketTiming}
                        onCheckedChange={(checked) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            enableMarketTiming: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSave("Agent", { agentSettings })}
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {isLoading ? "Saving..." : "Save Agent Configuration"}
                  </Button>
                </div>
              </GlassPanel>
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="space-y-6">
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Zap className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Automation Settings
                    </h2>
                    <p className="text-gray-600">
                      Configure automated portfolio management features
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Up Amount */}
                    <div>
                      <Label
                        htmlFor="topUpAmount"
                        className="text-sm font-medium text-gray-900"
                      >
                        Auto Top-Up Amount (USD)
                      </Label>
                      <Input
                        id="topUpAmount"
                        type="number"
                        value={automationSettings.topUpAmount}
                        onChange={(e) =>
                          setAutomationSettings((prev) => ({
                            ...prev,
                            topUpAmount: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder="100"
                      />
                    </div>

                    {/* Top Up Trigger */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-3 block">
                        Top-Up Trigger
                      </Label>
                      <Select
                        value={automationSettings.topUpTrigger}
                        onValueChange={(value) =>
                          setAutomationSettings((prev) => ({
                            ...prev,
                            topUpTrigger: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="balance-low">
                            When Balance Low
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Auto Rebalance */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Auto-Rebalancing
                        </Label>
                        <p className="text-sm text-gray-600">
                          Automatically rebalance portfolio based on strategy
                        </p>
                      </div>
                      <Switch
                        checked={automationSettings.autoRebalance}
                        onCheckedChange={(checked) =>
                          setAutomationSettings((prev) => ({
                            ...prev,
                            autoRebalance: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Auto Compound */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Auto-Compound Rewards
                        </Label>
                        <p className="text-sm text-gray-600">
                          Automatically reinvest earnings and rewards
                        </p>
                      </div>
                      <Switch
                        checked={automationSettings.autoCompound}
                        onCheckedChange={(checked) =>
                          setAutomationSettings((prev) => ({
                            ...prev,
                            autoCompound: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Auto Top Up */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Auto Top-Up
                        </Label>
                        <p className="text-sm text-gray-600">
                          Automatically add funds based on schedule or
                          conditions
                        </p>
                      </div>
                      <Switch
                        checked={automationSettings.autoTopUp}
                        onCheckedChange={(checked) =>
                          setAutomationSettings((prev) => ({
                            ...prev,
                            autoTopUp: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Emergency Stop */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Emergency Stop
                        </Label>
                        <p className="text-sm text-gray-600">
                          Halt all automation during high volatility periods
                        </p>
                      </div>
                      <Switch
                        checked={automationSettings.emergencyStop}
                        onCheckedChange={(checked) =>
                          setAutomationSettings((prev) => ({
                            ...prev,
                            emergencyStop: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() =>
                      handleSave("Automation", { automationSettings })
                    }
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {isLoading ? "Saving..." : "Save Automation Settings"}
                  </Button>
                </div>
              </GlassPanel>
            </TabsContent>

            {/* Research Tab */}
            <TabsContent value="research" className="space-y-6">
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Search className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Research Preferences
                    </h2>
                    <p className="text-gray-600">
                      Configure market research and analysis settings
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Research Level */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Research Detail Level
                    </Label>
                    <Select
                      value={researchSettings.researchLevel}
                      onValueChange={(value) =>
                        setResearchSettings((prev) => ({
                          ...prev,
                          researchLevel: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Research Alerts
                    </h3>

                    {/* New Opportunities */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          New Investment Opportunities
                        </Label>
                        <p className="text-sm text-gray-600">
                          Get notified about new high-yield opportunities
                        </p>
                      </div>
                      <Switch
                        checked={researchSettings.alerts.newOpportunities}
                        onCheckedChange={(checked) =>
                          setResearchSettings((prev) => ({
                            ...prev,
                            alerts: {
                              ...prev.alerts,
                              newOpportunities: checked,
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Risk Changes */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Risk Level Changes
                        </Label>
                        <p className="text-sm text-gray-600">
                          Alerts when protocol risk levels change significantly
                        </p>
                      </div>
                      <Switch
                        checked={researchSettings.alerts.riskChanges}
                        onCheckedChange={(checked) =>
                          setResearchSettings((prev) => ({
                            ...prev,
                            alerts: { ...prev.alerts, riskChanges: checked },
                          }))
                        }
                      />
                    </div>

                    {/* Market Volatility */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Market Volatility Warnings
                        </Label>
                        <p className="text-sm text-gray-600">
                          Get alerts during high market volatility periods
                        </p>
                      </div>
                      <Switch
                        checked={researchSettings.alerts.marketVolatility}
                        onCheckedChange={(checked) =>
                          setResearchSettings((prev) => ({
                            ...prev,
                            alerts: {
                              ...prev.alerts,
                              marketVolatility: checked,
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Auto Analysis */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Automated Analysis
                        </Label>
                        <p className="text-sm text-gray-600">
                          Automatically analyze portfolio performance and
                          suggest improvements
                        </p>
                      </div>
                      <Switch
                        checked={researchSettings.autoAnalysis}
                        onCheckedChange={(checked) =>
                          setResearchSettings((prev) => ({
                            ...prev,
                            autoAnalysis: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSave("Research", { researchSettings })}
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {isLoading ? "Saving..." : "Save Research Settings"}
                  </Button>
                </div>
              </GlassPanel>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bell className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Notification Preferences
                    </h2>
                    <p className="text-gray-600">
                      Control how and when you receive notifications
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-gray-600">
                          Receive updates about your investments via email
                        </p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            email: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Push Notifications
                        </Label>
                        <p className="text-sm text-gray-600">
                          Get instant notifications in your browser
                        </p>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            push: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Daily Reports */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Daily Portfolio Reports
                        </Label>
                        <p className="text-sm text-gray-600">
                          Daily summary of your portfolio performance
                        </p>
                      </div>
                      <Switch
                        checked={notifications.dailyReports}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            dailyReports: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Price Alerts */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Price Movement Alerts
                        </Label>
                        <p className="text-sm text-gray-600">
                          Notifications for significant price movements
                        </p>
                      </div>
                      <Switch
                        checked={notifications.priceAlerts}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            priceAlerts: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Agent Updates */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          AI Agent Updates
                        </Label>
                        <p className="text-sm text-gray-600">
                          Notifications when your AI agent makes trades or
                          recommendations
                        </p>
                      </div>
                      <Switch
                        checked={notifications.agentUpdates}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            agentUpdates: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Portfolio Rebalancing */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Portfolio Rebalancing
                        </Label>
                        <p className="text-sm text-gray-600">
                          Notifications when your portfolio is rebalanced
                        </p>
                      </div>
                      <Switch
                        checked={notifications.portfolioRebalancing}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            portfolioRebalancing: checked,
                          }))
                        }
                      />
                    </div>

                    {/* Research Updates */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-900">
                          Research & Market Updates
                        </Label>
                        <p className="text-sm text-gray-600">
                          Latest market research and analysis updates
                        </p>
                      </div>
                      <Switch
                        checked={notifications.researchUpdates}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            researchUpdates: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() =>
                      handleSave("Notifications", { notifications })
                    }
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {isLoading ? "Saving..." : "Save Notification Settings"}
                  </Button>
                </div>
              </GlassPanel>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-6">
              {/* Appearance Settings */}
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Palette className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Appearance & Localization
                    </h2>
                    <p className="text-gray-600">
                      Customize the look and feel of the application
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Theme */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Theme
                    </Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Currency */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Display Currency
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Language
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Timezone
                    </Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time
                        </SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() =>
                    handleSave("Appearance", {
                      theme,
                      currency,
                      language,
                      timezone,
                    })
                  }
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-white mt-6"
                >
                  {isLoading ? "Saving..." : "Save Appearance Settings"}
                </Button>
              </GlassPanel>

              {/* Security & Account */}
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Shield className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Security & Account
                    </h2>
                    <p className="text-gray-600">
                      Manage your account security and access
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Connected Account
                        </h3>
                        <p className="text-sm text-gray-600">
                          {googleAccount
                            ? "Google Account"
                            : githubAccount
                            ? "GitHub Account"
                            : "Wallet Connection"}
                        </p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Pro Plan</h3>
                        <p className="text-sm text-gray-600">
                          Access to advanced features and AI agent
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-600">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassPanel>

              {/* Billing */}
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Billing & Subscription
                    </h2>
                    <p className="text-gray-600">
                      Manage your Pro subscription and payment details
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Pro Plan Subscription
                        </h3>
                        <p className="text-sm text-gray-600">
                          Access to all professional features
                        </p>
                      </div>
                      <Button variant="outline">Manage Subscription</Button>
                    </div>
                  </div>
                </div>
              </GlassPanel>

              {/* Help & Support */}
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <HelpCircle className="text-orange-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Help & Support
                    </h2>
                    <p className="text-gray-600">
                      Get help and support for your Pro account
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/pro/support">
                    <Button variant="outline" className="w-full">
                      Contact Support
                    </Button>
                  </Link>
                  <Link href="/pro/support#faq">
                    <Button variant="outline" className="w-full">
                      View FAQ
                    </Button>
                  </Link>
                </div>
              </GlassPanel>

              {/* Account Actions */}
              <GlassPanel className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <LogOut className="text-gray-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Account Actions
                    </h2>
                    <p className="text-gray-600">
                      Sign out or manage your account
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Sign Out</h3>
                        <p className="text-sm text-gray-600">
                          Sign out of your Gangstr Pro account
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <LogOut size={16} className="mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
