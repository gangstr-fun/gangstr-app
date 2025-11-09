"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Wallet,
  Settings as SettingsIcon,
  Mail,
  Smartphone,
  Eye,
  EyeOff
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { LinkedAccountWithMetadata } from "@privy-io/react-auth";

/**
 * Settings Page - User settings
 * Focuses on essential settings like profile, notifications, and security
 */
export default function SettingsPage() {
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

  const [userName, setUserName] = useState(name);
  const [showWalletAddress, setShowWalletAddress] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    dailyReports: true,
    priceAlerts: false,
  });
  const [autoInvest, setAutoInvest] = useState(true);
  const [riskTolerance, setRiskTolerance] = useState("Medium");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Update userName when user data changes
  useEffect(() => {
    setUserName(name);
  }, [name]);

  const handleSave = (section: string) => {
    toast.success(`${section} settings saved successfully!`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
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
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Settings
            </h1>
            <p className="text-gray-600">
              Manage your account preferences and security settings.
            </p>
          </div>

          {/* Profile Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="text-primary" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
                <p className="text-gray-600">Update your personal information</p>
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
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
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
                  Wallet Address
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
                      onClick={() => setShowWalletAddress(!showWalletAddress)}
                    >
                      {showWalletAddress ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleSave("Profile")}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Save Profile
              </Button>
            </div>
          </div>

          {/* Investment Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <SettingsIcon className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Investment Preferences</h2>
                <p className="text-gray-600">Configure your investment settings</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Auto-Invest */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900">
                    Auto-Invest New Deposits
                  </Label>
                  <p className="text-sm text-gray-600">
                    Automatically invest new funds in the best performing vault
                  </p>
                </div>
                <Switch
                  checked={autoInvest}
                  onCheckedChange={setAutoInvest}
                />
              </div>

              {/* Risk Tolerance */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  Risk Tolerance
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {["Low", "Medium", "High"].map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setRiskTolerance(risk)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        riskTolerance === risk
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <div className="text-sm font-medium">{risk} Risk</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {risk === "Low" && "Conservative approach"}
                        {risk === "Medium" && "Balanced strategy"}
                        {risk === "High" && "Aggressive growth"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => handleSave("Investment")}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Save Preferences
              </Button>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
                <p className="text-gray-600">Choose how you want to be notified</p>
              </div>
            </div>

            <div className="space-y-4">
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
                    setNotifications((prev) => ({ ...prev, email: checked }))
                  }
                />
              </div>

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
                    setNotifications((prev) => ({ ...prev, push: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900">
                    Daily Reports
                  </Label>
                  <p className="text-sm text-gray-600">
                    Daily summary of your portfolio performance
                  </p>
                </div>
                <Switch
                  checked={notifications.dailyReports}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, dailyReports: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900">
                    Price Alerts
                  </Label>
                  <p className="text-sm text-gray-600">
                    Notifications for significant price movements
                  </p>
                </div>
                <Switch
                  checked={notifications.priceAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, priceAlerts: checked }))
                  }
                />
              </div>

              <Button 
                onClick={() => handleSave("Notification")}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Save Notifications
              </Button>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Security</h2>
                <p className="text-gray-600">Manage your account security</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Connected Account</h3>
                    <p className="text-sm text-gray-600">
                      {googleAccount ? "Google Account" : githubAccount ? "GitHub Account" : "Wallet Connection"}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Wallet Security</h3>
                    <p className="text-sm text-gray-600">
                      Your wallet is secured by your connected provider
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <LogOut className="text-gray-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Account</h2>
                <p className="text-gray-600">Manage your account</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Sign Out</h3>
                    <p className="text-sm text-gray-600">
                      Sign out of your Gangstr account
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
          </div>
        </div>
      </main>
    </div>
  );
}