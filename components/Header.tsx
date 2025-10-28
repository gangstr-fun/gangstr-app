import React, { useState } from "react";
import { Wallet, LogOut, Plus, Menu } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import Image from "next/image";
import Link from "next/link";
import TopUpModal from "./TopUpModal";
import { HeaderProps } from "@/lib/types";

const Header: React.FC<HeaderProps> = ({ toggleSidebar, mode = "pro" }) => {
  const { login, authenticated, user, logout } = usePrivy();
  const { userWalletAddress, userWalletStatus } = useUnifiedWallet();
  // const isMobile = useIsMobile();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 h-16 px-6 flex items-center justify-between relative z-20 shadow-sm">
      {/* Left side - Menu button only on mobile */}
      <div className="flex items-center">
        {/* Mobile menu button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-gray-600 hover:text-gray-900 mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile logo - only show on mobile when sidebar is closed */}
        <a
          href="https://gangstr.xyz"
          className="lg:hidden flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Image src="/new-logo.svg" alt="Gangstr" width={28} height={28} />
          <span className="text-lg font-semibold gradient-text">Gangstr</span>
        </a>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-3">
        {authenticated && (
          <>
            {/* Top Up Button */}
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="btn-primary flex items-center space-x-2 px-4 py-2 text-sm font-medium"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Top Up</span>
            </button>

            {/* Wallet Address */}
            {userWalletAddress && (
              <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm">
                <Wallet size={16} className="mr-2 text-gray-500" />
                <span className="text-gray-700 font-mono">
                  {`${userWalletAddress.slice(
                    0,
                    6
                  )}...${userWalletAddress.slice(-4)}`}
                </span>
              </div>
            )}

            {/* Settings and Logout */}
            <div className="flex items-center space-x-1">
              {/* <button
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Settings"
              >
                <Settings size={18} />
              </button> */}
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </>
        )}

        {!authenticated && (
          <button
            onClick={login}
            className="btn-primary px-6 py-2 text-sm font-medium"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Top Up Modal */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
      />
    </header>
  );
};

export default Header;
