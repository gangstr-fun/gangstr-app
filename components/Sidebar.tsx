import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Settings, X, Home, TrendingUp, PieChart, Search, HelpCircle } from "lucide-react";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const pathname = usePathname();
  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/discover", icon: TrendingUp, label: "Discover" },
    { href: "/agent/chat", icon: MessageSquare, label: "Agent Chat" },
    { href: "/portfolio", icon: PieChart, label: "Portfolio" },
    { href: "/research", icon: Search, label: "Research" },
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/support", icon: HelpCircle, label: "Support" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto lg:shadow-sm
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex flex-col px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <a
                href="https://gangstr.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center shadow-sm">
                  <Image
                    src="/logo.png"
                    alt="Gangstr"
                    width={32}
                    height={32}
                    className=""
                  />
                </div>
                <span className="text-2xl font-bold text-black">Gangstr</span>
              </a>
              <button
                onClick={onClose}
                className="lg:hidden text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                    ${
                      isActive
                        ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <Icon
                    size={18}
                    className={`
                      transition-all duration-200 flex-shrink-0
                      ${
                        isActive
                          ? "text-white"
                          : "text-gray-500 group-hover:text-primary-600"
                      }
                    `}
                  />
                  <span
                    className={`font-medium text-sm ${
                      isActive
                        ? "text-white"
                        : "text-gray-700 group-hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mode selector removed for Pro-only experience */}

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="text-center mb-3">
              <p className="text-xs text-gray-500 font-medium">
                Connect with us
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <a
                href="https://t.me/gangstrxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 rounded-xl group"
                title="Join our Telegram"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="group-hover:scale-110 transition-transform duration-200"
                >
                  <path d="M22.5 3.5c.27-.95-.57-1.78-1.5-1.44L1.86 9.07c-1.03.39-1.02 1.85.03 2.21l5.17 1.8 2 6.35c.3.94 1.48 1.17 2.12.4l2.86-3.42 5.15 3.77c.86.63 2.08.17 2.32-.87L22.5 3.5zM8.6 12.84l8.18-5.03c.2-.12.4.15.23.32l-6.33 6.2c-.15.15-.25.35-.28.56l-.27 2.02c-.03.23-.36.26-.43.04l-1.1-3.51c-.06-.2.03-.41.2-.52z" />
                </svg>
              </a>
              <a
                href="https://x.com/gangstrxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 rounded-xl group"
                title="Follow us on X"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="group-hover:scale-110 transition-transform duration-200"
                >
                  <path d="M18.244 2H21l-6.6 7.56L22 22h-6.844l-5.18-6.95L5.5 22H2l7.2-8.15L2.5 2h6.844l4.72 6.33L18.244 2zm-2.05 18h1.25L7.9 4H6.65l9.544 16z" />
                </svg>
              </a>
            </div>
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-400">© 2025 Gangstr</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
