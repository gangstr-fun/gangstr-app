"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePrivyWallet } from "@/lib/hooks/usePrivyWallet";
import {
  Send,
  Bot,
  User,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Shield,
  Search,
  ArrowDown,
  Wallet,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
// import { ResponsiveContainer } from '@/components/molecule/responsive-container';
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Render plain text with explicit line breaks preserved.
 */
const renderTextWithLineBreaks = (text: string): React.ReactNode[] => {
  const parts = text.split(/\n/);
  const nodes: React.ReactNode[] = [];
  parts.forEach((part, idx) => {
    nodes.push(<span key={`ln-${idx}`}>{part}</span>);
    if (idx < parts.length - 1) nodes.push(<br key={`br-${idx}`} />);
  });
  return nodes;
};

/**
 * Custom renderer for markdown-like content in agent messages
 * - Supports headings (##, ###)
 * - Supports bullet/numbered/lettered lists (-, *, •, 1., A.)
 * - Preserves single line breaks inside paragraphs
 */
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return <p>No content</p>;

  // Split text by paragraphs
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((paragraph, i) => {
        // Check for headings
        if (paragraph.startsWith("## ")) {
          const content = paragraph.replace(/^## /, "");
          return (
            <h2 key={i} className="text-lg font-normal my-2">
              {content}
            </h2>
          );
        }

        if (paragraph.startsWith("### ")) {
          const content = paragraph.replace(/^### /, "");
          return (
            <h3 key={i} className="text-md font-normal my-2">
              {content}
            </h3>
          );
        }

        // Detect bullet/numbered/lettered lists across lines
        const lines = paragraph.split(/\n/);
        const bulletRegex = /^(?:[-*]|•|\d+\.|[A-Z]\.)\s+/; // -, *, •, 1., A.
        const bulletLines = lines.filter((l) => bulletRegex.test(l.trim()));
        if (bulletLines.length >= 2) {
          // Split into optional preface + bullets
          const preface: string[] = [];
          const items: string[] = [];
          lines.forEach((l) => {
            const t = l.trim();
            if (bulletRegex.test(t)) {
              items.push(t.replace(bulletRegex, ""));
            } else if (t.length) {
              preface.push(t);
            }
          });

          return (
            <div key={i}>
              {preface.length > 0 && (
                <p className="my-2">
                  {processInlineMarkdown(preface.join("\n"))}
                </p>
              )}
              <ul className="list-disc pl-5 my-2">
                {items.map((item, j) => (
                  <li key={`${i}-${j}`} className="my-1">
                    {processInlineMarkdown(item)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Regular paragraph with inline formatting and line breaks
        return (
          <p key={i} className="my-2">
            {processInlineMarkdown(paragraph)}
          </p>
        );
      })}
    </>
  );
};

/**
 * Process inline markdown elements like bold and code
 */
const processInlineMarkdown = (text: string): React.ReactNode[] => {
  // Split by bold and code markers to process them separately
  const parts = [];
  let lastIndex = 0;
  let key = 0;

  // Process bold text: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let boldMatch;

  while ((boldMatch = boldRegex.exec(text)) !== null) {
    if (boldMatch.index > lastIndex) {
      // Add text before the match
      parts.push(
        <span key={key++}>
          {processCodeBlocks(text.substring(lastIndex, boldMatch.index))}
        </span>
      );
    }

    // Add the bold text
    parts.push(
      <strong key={key++} className="font-semibold">
        {processCodeBlocks(boldMatch[1])}
      </strong>
    );

    lastIndex = boldMatch.index + boldMatch[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={key++}>{processCodeBlocks(text.substring(lastIndex))}</span>
    );
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
};

/**
 * Process inline code blocks
 */
const processCodeBlocks = (text: string): React.ReactNode[] => {
  // Split by code markers `code`
  const parts = [];
  let lastIndex = 0;
  let key = 0;

  const codeRegex = /`([^`]+)`/g;
  let codeMatch;

  while ((codeMatch = codeRegex.exec(text)) !== null) {
    if (codeMatch.index > lastIndex) {
      // Add text before the match (preserve line breaks)
      parts.push(
        <span key={key++}>
          {renderTextWithLineBreaks(text.substring(lastIndex, codeMatch.index))}
        </span>
      );
    }

    // Add the code block
    parts.push(
      <code key={key++} className="bg-muted rounded px-1 py-0.5 text-xs">
        {codeMatch[1]}
      </code>
    );

    lastIndex = codeMatch.index + codeMatch[0].length;
  }

  // Add any remaining text (preserve line breaks)
  if (lastIndex < text.length) {
    parts.push(
      <span key={key++}>
        {renderTextWithLineBreaks(text.substring(lastIndex))}
      </span>
    );
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
};

const AgentChatPage = () => {
  const [activeMode] = useState<"research" | "automation">("automation");
  const [hasMounted, setHasMounted] = useState(false);
  const {
    walletAddress,
    agentWalletStatus,
    agentWalletAddress,
    refreshAgentWallet,
  } = usePrivyWallet();
  const isMobile = useIsMobile();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Message type definition
  type Message = {
    id: string;
    content: string;
    sender: "user" | "agent";
    timestamp: Date;
    agentType?: string;
  };

  // Separate message stores for each mode
  const [automationMessages, setAutomationMessages] = useState<Array<Message>>([
    {
      id: "1",
      content:
        "Hello! I'm your Stratifi AI Portfolio Automation agent. How can I assist with your portfolio today?",
      sender: "agent",
      timestamp: new Date(),
    },
  ]);

  const [researchMessages, setResearchMessages] = useState<Array<Message>>([
    {
      id: "1",
      content:
        "Hello! I'm your Stratifi AI Research agent. What markets or assets would you like to research today?",
      sender: "agent",
      timestamp: new Date(),
    },
  ]);

  // Separate input values for each mode
  const [automationInput, setAutomationInput] = useState("");
  const [researchInput, setResearchInput] = useState("");

  const [selectedAgent] = useState<string>("optimizer");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check scroll position to show/hide scroll to bottom button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollToBottom(isNotAtBottom);
  };

  useEffect(() => {
    scrollToBottom();

    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener("scroll", handleScroll);
      return () => {
        chatContainer.removeEventListener("scroll", handleScroll);
      };
    }
  }, [automationMessages, researchMessages, activeMode]);

  // Ensure client-only rendering for any non-deterministic UI bits
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const agentOptions = useMemo(
    () => [
      {
        id: "optimizer",
        name: "Optimizer",
        description: "AI-powered portfolio optimization",
        icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
        greeting:
          "I'm the Optimizer agent. I can help analyze your portfolio and suggest optimization strategies for better returns.",
      },
      {
        id: "risk",
        name: "Risk Guardian",
        description: "Risk analysis and management",
        icon: <Shield className="h-6 w-6 text-[rgb(210,113,254)]" />,
        greeting:
          "I'm your Risk Guardian. I'll help identify and mitigate risk factors in your portfolio and investment strategies.",
      },
      {
        id: "yield",
        name: "Yield Harvester",
        description: "Yield strategy optimization",
        icon: <BarChart3 className="h-6 w-6 text-green-500" />,
        greeting:
          "I'm the Yield Harvester. I'll help you maximize returns through optimized yield strategies and opportunities.",
      },
      {
        id: "research",
        name: "Market Researcher",
        description: "Market insights and analysis",
        icon: <Search className="h-6 w-6 text-amber-500" />,
        greeting:
          "I'm your Market Researcher. I can provide in-depth analysis and insights on market trends and opportunities.",
      },
    ],
    []
  );

  // Initialize with agent greeting when selected agent changes
  useEffect(() => {
    const selectedAgentOption = agentOptions.find(
      (agent) => agent.id === selectedAgent
    );

    if (selectedAgentOption && automationMessages.length === 0) {
      const updatedMessages: Message[] = [
        {
          id: Date.now().toString(),
          content: selectedAgentOption.greeting,
          sender: "agent",
          timestamp: new Date(),
          agentType: selectedAgent,
        },
      ];
      setAutomationMessages(updatedMessages);
    } else if (
      selectedAgentOption &&
      automationMessages.length > 0 &&
      automationMessages[0].sender === "agent" &&
      automationMessages[0].agentType !== selectedAgent
    ) {
      // Replace initial greeting when agent changes
      const updatedMessages = [...automationMessages];
      updatedMessages[0] = {
        ...updatedMessages[0],
        content: selectedAgentOption.greeting,
        agentType: selectedAgent,
      };
      setAutomationMessages(updatedMessages);
    }
  }, [selectedAgent, agentOptions, automationMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentInput =
      activeMode === "automation" ? automationInput : researchInput;
    if (!currentInput.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      sender: "user",
      timestamp: new Date(),
      agentType: activeMode === "automation" ? selectedAgent : "research",
    };

    if (activeMode === "automation") {
      setAutomationMessages((prev) => [...prev, newUserMessage]);
      setAutomationInput("");
    } else {
      setResearchMessages((prev) => [...prev, newUserMessage]);
      setResearchInput("");
    }

    setIsLoading(true);

    try {
      if (activeMode === "automation") {
        // Enhanced wallet validation
        if (!walletAddress) {
          throw new Error("Please connect your wallet to continue");
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          throw new Error(
            "Invalid wallet address format. Please reconnect your wallet."
          );
        }

        if (agentWalletStatus === "loading") {
          throw new Error(
            "Agent wallet is still being set up. Please wait a moment and try again."
          );
        }

        if (agentWalletStatus === "error") {
          throw new Error(
            "Agent wallet setup failed. Please refresh the page and try again."
          );
        }

        if (agentWalletStatus !== "ready") {
          throw new Error(
            "Agent wallet not ready. Please wait for setup to complete."
          );
        }

        console.log("[CHAT] Making API request with wallet:", walletAddress);
        console.log("[CHAT] Agent wallet status:", agentWalletStatus);
        console.log("[CHAT] Agent wallet address:", agentWalletAddress);

        // Prepare message history for the new API
        const messageHistory = automationMessages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content,
        }));

        // Add the current message to history
        messageHistory.push({
          role: "user",
          content: currentInput,
        });

        const response = await fetch("/api/chat-with-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWalletAddress: walletAddress,
            chain_id: "base-sepolia", // Default chain
            agent_id: selectedAgent,
            session_id: `session_${walletAddress}_${selectedAgent}`,
            messageHistory: messageHistory,
          }),
        });

        console.log("[CHAT] API response status:", response.status);
        console.log("[CHAT] API response ok:", response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[CHAT] API error response:", errorData);

          // Enhanced error handling based on status codes
          if (response.status === 503) {
            if (
              errorData.error?.includes("wallet") ||
              errorData.error?.includes("initialization")
            ) {
              throw new Error(
                `Wallet initialization error: ${errorData.error}. Please refresh the page and try again.`
              );
            } else if (
              errorData.error?.includes("cdp") ||
              errorData.error?.includes("coinbase")
            ) {
              throw new Error(
                `Coinbase Developer Platform error: ${errorData.error}. Please try again later.`
              );
            } else if (
              errorData.error?.includes("network") ||
              errorData.error?.includes("rpc")
            ) {
              throw new Error(
                `Network connection error: ${errorData.error}. Please check your connection and try again.`
              );
            } else {
              throw new Error(
                `Service temporarily unavailable: ${errorData.error}. Please try again in a moment.`
              );
            }
          } else if (response.status === 400) {
            if (errorData.error?.includes("wallet address")) {
              throw new Error(
                `Wallet connection error: ${errorData.error}. Please reconnect your wallet.`
              );
            } else {
              throw new Error(
                `Invalid request: ${errorData.error}. Please check your input and try again.`
              );
            }
          } else if (response.status === 401) {
            throw new Error(
              `Authentication error: ${errorData.error}. Please reconnect your wallet.`
            );
          } else {
            throw new Error(
              `API error (${response.status}): ${
                errorData.error || "Unknown error"
              }`
            );
          }
        }

        const data = await response.json();
        console.log("[CHAT] API response data:", data);

        if (data.agent_response) {
          const newAgentMessage: Message = {
            id: Date.now().toString(),
            content: data.agent_response,
            sender: "agent",
            timestamp: new Date(),
            agentType: selectedAgent,
          };

          setAutomationMessages((prev) => [...prev, newAgentMessage]);

          // Refresh agent wallet address after successful interaction
          // This ensures we show the deployed smart wallet address
          console.log(
            "[CHAT] Refreshing agent wallet address after successful interaction..."
          );
          refreshAgentWallet();
        } else if (data.error) {
          console.error("Agent error:", data.error);

          const errorMessage: Message = {
            id: Date.now().toString(),
            content: `## Error\n\n**Details:** ${data.error}`,
            sender: "agent",
            timestamp: new Date(),
            agentType: selectedAgent,
          };

          setAutomationMessages((prev) => [...prev, errorMessage]);
        }
      } else {
        // Mock research response
        setTimeout(() => {
          const researchResponse: Message = {
            id: Date.now().toString(),
            content: `## Research Results\n\n**Query:** "${currentInput}"\n\nThis is a mock research response with markdown formatting.\n\n* Point 1\n* Point 2\n* Point 3`,
            sender: "agent",
            timestamp: new Date(),
            agentType: "research",
          };

          setResearchMessages((prev) => [...prev, researchResponse]);
          setIsLoading(false);
        }, 1500);
        return; // Early return for research mode
      }
    } catch (error) {
      console.error("Failed to send message to agent:", error);

      // Enhanced error message formatting
      let errorContent = "";
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      if (errorMsg.includes("Wallet initialization error")) {
        errorContent = `## Wallet Connection Issue

⚠️ Your wallet connection needs to be refreshed.

**What happened:** ${errorMsg}

**Solution:** Please refresh the page, ensure your wallet is connected, and try again.`;
      } else if (
        errorMsg.includes("Wallet connection error") ||
        errorMsg.includes("Invalid wallet address")
      ) {
        errorContent = `## Wallet Connection Required

⚠️ Your wallet needs to be properly connected.

**What happened:** ${errorMsg}

**Solution:** Please connect your wallet using the "Connect Wallet" button in the top right corner.`;
      } else if (errorMsg.includes("Coinbase Developer Platform error")) {
        errorContent = `## Service Temporarily Unavailable

⚠️ The Coinbase Developer Platform is experiencing issues.

**What happened:** ${errorMsg}

**Solution:** Please try again in a few minutes.`;
      } else if (errorMsg.includes("Network connection error")) {
        errorContent = `## Network Connection Issue

⚠️ There's a problem with your network connection.

**What happened:** ${errorMsg}

**Solution:** Please check your internet connection and try again.`;
      } else if (errorMsg.includes("Authentication error")) {
        errorContent = `## Authentication Failed

⚠️ Your wallet authentication has expired.

**What happened:** ${errorMsg}

**Solution:** Please reconnect your wallet and try again.`;
      } else {
        errorContent = `## Error

Sorry, there was an error communicating with the agent.

**Details:** ${errorMsg}

**Solution:** Please try refreshing the page and try again.`;
      }

      const errorMessage: Message = {
        id: Date.now().toString(),
        content: errorContent,
        sender: "agent",
        timestamp: new Date(),
        agentType: activeMode === "automation" ? selectedAgent : "research",
      };

      if (activeMode === "automation") {
        setAutomationMessages((prev) => [...prev, errorMessage]);
      } else {
        setResearchMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      if (activeMode === "automation") {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Wallet Status */}
      {walletAddress && (
        <div className="p-2 bg-secondary border-b border-border">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wallet className="h-3 w-3 text-green-500" />
              <span>
                User wallet: {walletAddress.substring(0, 6)}...
                {walletAddress.substring(walletAddress.length - 4)}
              </span>
            </div>

            {/* Agent Wallet Status */}
            <div className="flex items-center gap-2">
              {agentWalletStatus === "loading" && (
                <>
                  <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
                  <span className="text-primary">
                    Setting up agent wallet...
                  </span>
                </>
              )}
              {agentWalletStatus === "ready" && agentWalletAddress && (
                <>
                  <Image
                    src="/new-logo.svg"
                    alt="Agent"
                    width={12}
                    height={12}
                  />
                  <span className="text-green-600">
                    Agent wallet: {agentWalletAddress.substring(0, 6)}...
                    {agentWalletAddress.substring(
                      agentWalletAddress.length - 4
                    )}
                  </span>
                </>
              )}
              {agentWalletStatus === "error" && (
                <>
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-red-600">
                    Agent wallet setup failed
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/*
        Header (mode toggle and subtext) temporarily disabled.
        <div className="px-3 sm:px-4 py-3 border-b border-border bg-secondary bg-opacity-95 backdrop-blur-sm">
          <div className="flex justify-center mt-2 sm:mt-4">
            <div className="bg-secondary p-1 rounded-full border border-border shadow-lg">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveMode("research")}
                  className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
                    activeMode === "research"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Search className="inline-block h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {isMobile ? "Research" : "Research Mode"}
                </button>
                <button
                  onClick={() => setActiveMode("automation")}
                  className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
                    activeMode === "automation"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Image src="/new-logo.svg" alt="Automation" width={16} height={16} className="inline-block mr-1 sm:mr-2" />
                  {isMobile ? "Automation" : "Automation Mode"}
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-muted-foreground text-xs sm:text-sm mt-2">
            {activeMode === "automation"
              ? "Portfolio optimization & investment management."
              : "Market analysis, trends & investment insights."}
          </p>
        </div>
      */}

      {/* Chat Interface based on active mode */}
      <div className="relative flex flex-col flex-1 overflow-hidden">
        {/* Agent Selection Dropdown disabled
        {activeMode === "automation" && (
          <div className="p-3 sm:p-4 bg-secondary backdrop-blur-sm border-b border-border shadow-md">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-background border border-border text-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-inner transition-all appearance-none text-sm"
                >
                  {agentOptions.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                      {!isMobile && ` - ${agent.description}`}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        */}

        {/* Chat Messages Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto"
          style={{ paddingBottom: isMobile ? "120px" : "100px" }}
        >
          {(activeMode === "automation"
            ? automationMessages
            : researchMessages
          ).map((message) => (
            <div
              key={message.id}
              className={`flex items-start mb-3 sm:mb-4 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "agent" && (
                <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center mr-2 sm:mr-3 bg-secondary border border-border shadow-lg">
                  <Image
                    src="/new-logo.svg"
                    alt="Agent"
                    width={16}
                    height={16}
                  />
                </div>
              )}

              <div
                className={`rounded-xl p-3 sm:p-4 max-w-[80%] sm:max-w-[70%] shadow-lg backdrop-blur-sm ${
                  message.sender === "user"
                    ? "bg-primary/10 border border-primary/30 text-foreground ml-auto order-1"
                    : "bg-accent/10 border border-accent/30 text-foreground"
                }`}
              >
                {message.sender === "user" ? (
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                ) : (
                  <div className="text-xs sm:text-sm markdown-content">
                    {renderMarkdown(message.content)}
                  </div>
                )}
                <p
                  className="text-[10px] sm:text-xs text-muted-foreground mt-1"
                  suppressHydrationWarning
                >
                  {hasMounted
                    ? new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>

              {message.sender === "user" && (
                <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center ml-2 sm:ml-3 order-2 bg-[rgba(210,113,254,0.15)] border border-[rgba(210,113,254,0.3)]">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className={cn(
            "absolute right-4 bg-[rgb(210,113,254)] text-black p-2 rounded-full shadow-lg animate-bounce z-40",
            isMobile ? "bottom-20" : "bottom-20"
          )}
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* Fixed Input Area */}
      <div
        className={cn(
          "fixed p-3 sm:p-4 bg-secondary border-t border-border shadow-lg z-50 min-h-[72px] sm:min-h-[88px] flex items-center",
          isMobile ? "left-0 right-0 bottom-16" : "left-64 right-0 bottom-0"
        )}
        style={{
          paddingBottom: isMobile
            ? "0.75rem"
            : `calc(0.75rem + env(safe-area-inset-bottom))`,
        }}
      >
        <div className="w-full max-w-3xl sm:max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex w-full">
            <input
              type="text"
              placeholder={
                activeMode === "automation"
                  ? isMobile
                    ? "Ask about portfolio..."
                    : "Ask about portfolio optimization and strategies..."
                  : isMobile
                  ? "Ask about markets..."
                  : "Ask about market trends, assets, or news..."
              }
              className="flex-1 w-full bg-background border border-border text-foreground px-3 sm:px-4 py-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-inner transition-all text-sm"
              value={
                activeMode === "automation" ? automationInput : researchInput
              }
              onChange={(e) =>
                activeMode === "automation"
                  ? setAutomationInput(e.target.value)
                  : setResearchInput(e.target.value)
              }
              disabled={isLoading}
            />
            <button
              type="submit"
              className={cn(
                "bg-primary text-primary-foreground px-4 sm:px-6 py-3 rounded-r-lg shadow-lg transition-all",
                !(
                  activeMode === "automation" ? automationInput : researchInput
                ).trim() || isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              )}
              disabled={
                !(
                  activeMode === "automation" ? automationInput : researchInput
                ).trim() || isLoading
              }
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentChatPage;
