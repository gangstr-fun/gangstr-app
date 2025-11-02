"use client";

import React, { useState, useEffect, useRef } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Send, Bot, User, PlusCircle } from "lucide-react";
import { AgentRequest, AgentResponse } from "@/lib/types/api";
import { AutomationCard } from "@/components/AutomationCard";
import { Automation } from "@/lib/types";
import Image from "next/image";

export default function AutomationPage() {
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
        "I'm your Automation Assistant. I can help you create, backtest, and deploy automated trading and yield farming strategies. How can I help you today?",
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock data for automations
  const [automations] = useState<Automation[]>([
    {
      id: "1",
      name: "ETH/USDC Grid Trading",
      status: "active",
      pnl: 1250.75,
      apy: 15.2,
      createdAt: "2023-10-01T14:48:00.000Z",
    },
    {
      id: "2",
      name: "Aave Staking Maximizer",
      status: "active",
      pnl: 850.2,
      apy: 8.5,
      createdAt: "2023-09-15T10:20:00.000Z",
    },
    {
      id: "3",
      name: "BTC Trend Following",
      status: "paused",
      pnl: -250.0,
      apy: -2.1,
      createdAt: "2023-08-20T18:00:00.000Z",
    },
  ]);

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
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: inputValue,
          agentType: "automation",
          mode: "automation",
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

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 relative">
      {/* Chat Toggle Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-24 sm:bottom-6 right-6 bg-primary-500 hover:bg-primary-600 text-white rounded-full p-4 shadow-lg z-50 transition-transform hover:scale-110"
      >
        <Image
          src="/new-logo.svg"
          alt="Automation Assistant"
          width={32}
          height={32}
        />
      </button>

      {/* Chat Panel */}
      {chatOpen && (
        <GlassPanel className="fixed bottom-32 sm:bottom-24 right-6 w-full max-w-md h-[70vh] flex flex-col z-40">
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
                    <Image
                      src="/new-logo.svg"
                      alt="Agent"
                      width={24}
                      height={24}
                    />
                  )}
                  <div
                    className={`p-3 rounded-lg max-w-xs ${
                      msg.sender === "user" ? "bg-blue-600" : "bg-gray-700"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.sender === "user" && (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-start gap-3">
                  <Image
                    src="/new-logo.svg"
                    alt="Agent"
                    width={24}
                    height={24}
                  />
                  <div className="p-3 rounded-lg bg-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <form
            onSubmit={handleChatSubmit}
            className="p-4 border-t border-white/10"
          >
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your automation strategy..."
                className="w-full bg-gray-800 border-gray-700 rounded-full py-2 pl-4 pr-12"
                disabled={isChatLoading}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-500 rounded-full hover:bg-primary-600 disabled:bg-gray-600"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </GlassPanel>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-normal text-gradient-primary">
          Strategy Hub
        </h1>
        <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-normal py-2 px-4 rounded-lg transition-colors">
          <PlusCircle className="w-5 h-5" />
          <span>New Automation</span>
        </button>
      </div>

      {/* Automation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} />
        ))}
      </div>
    </div>
  );
}
