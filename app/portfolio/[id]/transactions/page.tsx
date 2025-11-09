"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  usePortfolioStore,
  Portfolio,
  Transaction,
} from "@/lib/stores/portfolio-store";
import { getTxExplorerUrl } from "@/lib/utils/explorer";
import { DashboardCard } from "@/components/ui/dashboard-card";

export default function PortfolioTransactionsPage() {
  const params = useParams();
  const portfolioId = params.id as string;
  const { portfolios } = usePortfolioStore();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [typeFilter, setTypeFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const fetchedPortfolio = portfolios.find((p) => p.id === portfolioId);
    setPortfolio(fetchedPortfolio || null);

    if (fetchedPortfolio) {
      const allTransactions = (fetchedPortfolio.assets || []).flatMap(
        (asset) => asset.transactions || []
      ) as Transaction[];
      if (allTransactions.length === 0) {
        setTransactions(generateMockTransactions(fetchedPortfolio));
      } else {
        setTransactions(
          allTransactions.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
      }
    }

    setIsLoading(false);
  }, [portfolioId, portfolios]);

  function generateMockTransactions(portfolio: Portfolio): Transaction[] {
    if (!portfolio || !portfolio.assets) return [];
    const mockTransactions: Transaction[] = [];
    const transactionTypes: Transaction["transactionType"][] = [
      "DEPOSIT",
      "WITHDRAWAL",
      "SWAP",
      "YIELD_FARMING",
      "STAKING",
    ];

    for (let i = 0; i < 20; i++) {
      const asset =
        portfolio.assets[Math.floor(Math.random() * portfolio.assets.length)];
      if (!asset) continue;

      const type =
        transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const amount =
        Math.random() *
        (type === "DEPOSIT" || type === "YIELD_FARMING" ? 1000 : 500);
      const price = asset.currentPrice || Math.random() * 3000;

      mockTransactions.push({
        id: `tx-${Date.now()}-${i}`,
        assetId: asset.id,
        amount: amount,
        price: price,
        transactionType: type,
        timestamp: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ),
        status: "Completed",
        hash: `0x${[...Array(64)]
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join("")}`,
      });
    }
    return mockTransactions;
  }

  const getUniqueAssetSymbols = (transactions: Transaction[]) => {
    if (!transactions || !portfolio?.assets) return [];
    const assetSymbols = new Set<string>();
    transactions.forEach((tx) => {
      const asset = portfolio.assets.find((a) => a.id === tx.assetId);
      if (asset) assetSymbols.add(asset.symbol);
    });
    return Array.from(assetSymbols);
  };

  const filteredTransactions = transactions
    .filter((tx) => typeFilter === "all" || tx.transactionType === typeFilter)
    .filter((tx) => {
      if (assetFilter === "all") return true;
      const asset = portfolio?.assets.find((a) => a.id === tx.assetId);
      return asset?.symbol === assetFilter;
    })
    .filter((tx) => {
      if (dateFilter === "all") return true;
      const txDate = new Date(tx.timestamp);
      const now = new Date();
      if (dateFilter === "last_24h")
        return now.getTime() - txDate.getTime() <= 24 * 60 * 60 * 1000;
      if (dateFilter === "last_7d")
        return now.getTime() - txDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
      if (dateFilter === "last_30d")
        return now.getTime() - txDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
      return true;
    });

  return (
    <div className="container mx-auto p-4">
      <DashboardCard
        title={`Transactions for ${portfolio?.name || "Portfolio"}`}
        accent="secondary"
        loading={isLoading}
      >
        <div className="p-4 space-y-4">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white/10 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="SWAP">Swap</option>
              <option value="YIELD_FARMING">Yield Farming</option>
              <option value="STAKING">Staking</option>
            </select>

            {/* Asset Filter */}
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="bg-white/10 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Assets</option>
              {getUniqueAssetSymbols(transactions).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white/10 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Time</option>
              <option value="last_24h">Last 24 hours</option>
              <option value="last_7d">Last 7 days</option>
              <option value="last_30d">Last 30 days</option>
            </select>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  portfolio={portfolio}
                />
              ))
            ) : (
              <div className="text-center text-black py-8">
                No transactions found.
              </div>
            )}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

function TransactionRow({
  transaction,
  portfolio,
}: {
  transaction: Transaction;
  portfolio: Portfolio | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getTransactionIcon = (type: Transaction["transactionType"]) => {
    switch (type) {
      case "DEPOSIT":
        return "⬇️";
      case "WITHDRAWAL":
        return "⬆️";
      case "SWAP":
        return "🔄";
      case "YIELD_FARMING":
        return "🌾";
      case "STAKING":
        return "🔒";
      default:
        return "➡️";
    }
  };

  const getTransactionColor = (type: Transaction["transactionType"]) => {
    switch (type) {
      case "DEPOSIT":
        return "bg-green-900/20 text-green-400";
      case "WITHDRAWAL":
        return "bg-red-900/20 text-red-400";
      case "SWAP":
        return "bg-blue-900/20 text-blue-400";
      case "YIELD_FARMING":
        return "bg-yellow-900/20 text-yellow-400";
      case "STAKING":
        return "bg-[rgba(210,113,254,0.15)] text-[rgb(210,113,254)]";
      default:
        return "bg-gray-700/20 text-gray-400";
    }
  };

  const asset = portfolio?.assets.find((a) => a.id === transaction.assetId);

  return (
    <div
      className={`rounded-lg transition-all duration-300 ${
        expanded ? "bg-white/10" : "bg-white/5"
      }`}
    >
      <div
        className="flex items-center p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-lg ${getTransactionColor(
            transaction.transactionType
          )}`}
        >
          {getTransactionIcon(transaction.transactionType)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="font-medium">
              {asset?.name || "Unknown Asset"}
            </span>
            <span
              className={`font-mono text-sm ${
                transaction.amount >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {transaction.amount.toFixed(4)} {asset?.symbol}
            </span>
          </div>
          <div className="text-xs text-black mt-1">
            {formatDate(new Date(transaction.timestamp))}
          </div>
        </div>
        <div className="ml-4 text-black">{expanded ? "▲" : "▼"}</div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-white/10 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-black">Type:</span>
            <span>{transaction.transactionType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black">Price:</span>
            <span>${(transaction.price || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black">Total Value:</span>
            <span>
              ${(transaction.amount * (transaction.price || 0)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-black">Status:</span>
            <span>{transaction.status}</span>
          </div>
          {transaction.hash && (
            <div className="flex justify-between items-center">
              <span className="text-black">Tx Hash:</span>
              <a
                href={getTxExplorerUrl(transaction.hash, asset?.chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary-400 hover:underline truncate max-w-[150px] sm:max-w-xs"
              >
                {transaction.hash}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
