"use client";

import React, { useState, useEffect, useRef } from "react";
import { useResearchStore } from "@/lib/stores/research-store";
// import { GlassPanel } from '@/components/ui/glass-panel';
import { ProtocolCard } from "@/components/ProtocolCard";
import { StatsCards } from "../../../components/research/StatsCards";
import { FiltersPanel } from "../../../components/research/FiltersPanel";
import {
  Send,
  Bot,
  User,
  Search,
  RefreshCw,
  Filter,
  X,
  ChevronUp,
} from "lucide-react";
import { AgentRequest, AgentResponse } from "@/lib/types/api";
import { ResponsiveContainer } from "@/components/molecule/responsive-container";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function ResearchPage() {
  // Mobile detection
  const isMobile = useIsMobile();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      content: string;
      sender: "user" | "agent";
      timestamp: Date;
    }>
  >([
    {
      id: "1",
      content:
        "I'm your Research Assistant. I can help you analyze protocols, find investment opportunities, and provide insights on market trends. What would you like to know?",
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("apy");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [messages, chatOpen]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user" as const,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsChatLoading(true);

    try {
      // Call the agent API
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: inputValue,
          agentType: "research",
          mode: "research",
        } as AgentRequest),
      });

      const data = (await response.json()) as AgentResponse;

      if (data.error) {
        throw new Error(data.error);
      }

      const newAgentMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I'm sorry, I couldn't process your request.",
        sender: "agent" as const,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newAgentMessage]);
    } catch (error) {
      console.error("Error calling agent API:", error);

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: `I apologize, but I encountered an error. Please try again later. ${
          error instanceof Error ? error.message : ""
        }`,
        sender: "agent" as const,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };
  const {
    protocols,
    favoriteProtocols,
    filters,
    isLoading,
    toggleFavorite,
    updateFilters,
    resetFilters,
  } = useResearchStore();

  const [filteredProtocols, setFilteredProtocols] = useState(protocols);

  // Get unique categories, chains, and chain names from protocols
  const categories = Array.from(new Set(protocols.map((p) => p.category)));
  const chains = Array.from(new Set(protocols.map((p) => p.chainId)));
  const chainNames = Object.fromEntries(
    protocols.map((p) => [p.chainId, p.chainName])
  );

  // Apply filters whenever protocols or filters change
  useEffect(() => {
    if (!protocols.length) return;

    let result = [...protocols];

    // Apply category filters
    if (filters.categories.length > 0) {
      result = result.filter((p) => filters.categories.includes(p.category));
    }

    // Apply chain filters
    if (filters.chains.length > 0) {
      result = result.filter((p) => filters.chains.includes(p.chainId));
    }

    // Apply risk score filter
    if (filters.maxRiskScore < 10) {
      result = result.filter((p) => p.riskScore <= filters.maxRiskScore);
    }

    // Apply APY filter
    if (filters.minAPY > 0) {
      result = result.filter((p) => p.apy >= filters.minAPY);
    }

    // Apply audit filter
    if (filters.auditedOnly) {
      result = result.filter((p) => p.audited);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (sortOption) {
      case "apy":
        result = result.sort((a, b) => b.apy - a.apy);
        break;
      case "risk":
        result = result.sort((a, b) => a.riskScore - b.riskScore);
        break;
      case "tvl":
        result = result.sort((a, b) => b.tvl - a.tvl);
        break;
      default:
        break;
    }

    setFilteredProtocols(result);
  }, [protocols, filters, searchQuery, sortOption]);

  useEffect(() => {
    // Initial fetch of protocols
    // In a real app, this would be an API call
    // For now, we use the initial state from the store
  }, []);

  const totalProtocols = protocols.length;
  const averageApy =
    protocols.length > 0
      ? protocols.reduce((sum, p) => sum + p.apy, 0) / protocols.length
      : 0;
  const averageRiskScore = 0;

  return (
    <ResponsiveContainer>
      <div className="relative pb-16 sm:pb-0">
        {/* Chat Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-24 sm:bottom-6 right-6 bg-[rgb(210,113,254)] text-black rounded-full p-3 sm:p-4 shadow-lg z-50 transition-all hover:scale-105"
          aria-label={chatOpen ? "Close AI assistant" : "Open AI assistant"}
        >
          <Image
            src="/logo.png"
            alt="Research Assistant"
            width={28}
            height={28}
          />
        </button>

        {/* Chat Panel */}
        {chatOpen && (
          <div className="fixed inset-0 sm:inset-auto sm:bottom-32 sm:right-6 sm:w-full sm:max-w-md sm:h-[70vh] flex flex-col z-40 bg-background/95 backdrop-blur-md sm:rounded-2xl sm:border sm:border-border shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center">
                <Image
                  src="/logo.png"
                  alt="Research Assistant"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                <h3 className="font-medium">Research Assistant</h3>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      msg.sender === "user" ? "justify-end" : ""
                    }`}
                  >
                    {msg.sender === "agent" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[rgba(210,113,254,0.15)] border border-[rgba(210,113,254,0.3)]">
                        <Image
                          src="/logo.png"
                          alt="Agent"
                          width={16}
                          height={16}
                        />
                      </div>
                    )}

                    <div
                      className={cn(
                        "p-3 rounded-xl max-w-[80%] shadow-md",
                        msg.sender === "user"
                          ? "bg-[rgb(210,113,254)] text-black"
                          : "bg-muted border border-border"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {msg.sender === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-900/50 border border-indigo-700/50">
                        <User className="w-4 h-4 text-indigo-400" />
                      </div>
                    )}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[rgba(210,113,254,0.15)] border border-[rgba(210,113,254,0.3)]">
                      <Image
                        src="/logo.png"
                        alt="Agent"
                        width={16}
                        height={16}
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-muted border border-border shadow-md">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[rgb(210,113,254)] rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-150"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <form
              onSubmit={handleChatSubmit}
              className="p-3 border-t border-border"
            >
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about protocols, trends, risks..."
                  className="w-full bg-background border border-border rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full",
                    inputValue.trim()
                      ? "bg-[rgb(210,113,254)] text-black"
                      : "bg-muted"
                  )}
                  disabled={!inputValue.trim() || isChatLoading}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-normal mb-4 sm:mb-0">
            Protocol Research
          </h1>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Mobile filters toggle */}
            {isMobile && (
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex items-center px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters{" "}
                {showMobileFilters ? (
                  <ChevronUp className="ml-1 w-4 h-4" />
                ) : null}
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards
          totalProtocols={totalProtocols}
          favoriteProtocolsCount={favoriteProtocols.length}
          averageApy={averageApy}
          averageRiskScore={averageRiskScore}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-6 mt-6">
          {/* Filters - Hidden on mobile by default unless toggled */}
          <div
            className={cn(
              "lg:block",
              isMobile ? (showMobileFilters ? "block" : "hidden") : "block"
            )}
          >
            <FiltersPanel
              filters={filters}
              updateFilters={updateFilters}
              resetFilters={resetFilters}
              categories={categories}
              chains={chains}
              chainNames={chainNames}
            />
          </div>

          {/* Protocols List */}
          <div className="lg:col-span-3">
            <div className="bg-secondary border border-border rounded-xl p-4 mb-5">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Search protocols..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="bg-background border border-border rounded-lg p-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="apy">Sort by: APY</option>
                    <option value="risk">Sort by: Risk</option>
                    <option value="tvl">Sort by: TVL</option>
                  </select>
                  <button className="p-2 bg-muted rounded-lg hover:opacity-90 border border-border">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-secondary p-5 rounded-xl animate-pulse border border-border"
                  >
                    <div className="h-6 w-3/4 bg-muted rounded mb-4"></div>
                    <div className="h-4 w-1/2 bg-muted rounded mb-2"></div>
                    <div className="h-4 w-1/3 bg-muted rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-8 w-20 bg-muted rounded"></div>
                      <div className="h-8 w-20 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProtocols.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted rounded-full p-6 mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No protocols found</h3>
                <p className="text-muted-foreground max-w-md">
                  Try adjusting your filters or search query to find protocols
                  that match your criteria.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-[rgb(210,113,254)] rounded-lg text-black text-sm"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredProtocols.map((protocol) => (
                  <ProtocolCard
                    key={protocol.id}
                    protocol={protocol}
                    isFavorite={favoriteProtocols.includes(protocol.id)}
                    onToggleFavorite={() => toggleFavorite(protocol.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
