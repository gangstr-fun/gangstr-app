"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePortfolioStore } from "@/lib/stores/portfolio-store";
// import { GlassPanel } from "@/components/ui/glass-panel";
import {
  ResponsiveCard,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
  ResponsiveCardContent,
} from "@/components/molecule/responsive-card";
import { ResponsiveContainer } from "@/components/molecule/responsive-container";
// import { ResponsiveGrid } from "@/components/molecule/responsive-grid";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TrendingUp,
  TrendingDown,
  // ArrowRight,
  Clock,
  Settings,
  Plus,
  PieChart,
  // Info,
  ChevronRight,
  // Bell,
} from "lucide-react";
import { mockPortfolios } from "@/lib/data";
// import { portfolioData } from "@/lib/utils/functions";

export default function PortfolioDashboardPage() {
  const {
    portfolios,
    selectedPortfolio,
    selectPortfolio,
    isLoading,
    setPortfolios,
  } = usePortfolioStore();
  const [timeframe, setTimeframe] = useState("1M"); // 1D, 1W, 1M, 3M, 1Y, ALL
  // const [activeTab, setActiveTab] = useState("main");
  // const [portfolioStats, setPortfolioStats] = useState(portfolioData);
  const isMobile = useIsMobile();

  // Load mock data
  useEffect(() => {
    if (portfolios.length === 0) {
      setPortfolios(mockPortfolios);
      selectPortfolio(mockPortfolios[0].id);
    }
  }, [portfolios, selectPortfolio, setPortfolios]);

  // Filter performance metrics based on selected timeframe
  const getTimeframeData = () => {
    if (!selectedPortfolio || !selectedPortfolio.performanceMetrics) {
      return { labels: [], data: [] };
    }

    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case "1D":
        startDate.setDate(now.getDate() - 1);
        break;
      case "1W":
        startDate.setDate(now.getDate() - 7);
        break;
      case "1M":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "1Y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "ALL":
        startDate = new Date(0);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const filteredMetrics = selectedPortfolio.performanceMetrics.filter(
      (metric) => new Date(metric.date) >= startDate
    );

    return {
      labels: filteredMetrics.map((m) =>
        new Date(m.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      ),
      data: filteredMetrics.map((m) => m.value),
    };
  };

  // Calculate portfolio statistics
  const getPortfolioStats = () => {
    if (
      !selectedPortfolio ||
      !selectedPortfolio.performanceMetrics ||
      selectedPortfolio.performanceMetrics.length === 0
    ) {
      return {
        totalValue: 0,
        dayChange: 0,
        dayChangePercent: 0,
        cumulativeReturn: 0,
      };
    }

    const metrics = selectedPortfolio.performanceMetrics;
    const latestValue = metrics[metrics.length - 1].value;
    const previousDayValue =
      metrics.length > 1 ? metrics[metrics.length - 2].value : metrics[0].value;

    const dayChange = latestValue - previousDayValue;
    const dayChangePercent =
      previousDayValue !== 0 ? (dayChange / previousDayValue) * 100 : 0;
    const cumulativeReturn = metrics[metrics.length - 1].cumulativeReturn;

    const totalValue = selectedPortfolio.assets.reduce(
      (sum, asset) => sum + asset.amount * (asset.currentPrice || 0),
      0
    );

    return { totalValue, dayChange, dayChangePercent, cumulativeReturn };
  };

  const stats = getPortfolioStats();
  const chartData = getTimeframeData();

  // Get asset allocation by type
  const getAssetAllocation = () => {
    if (
      !selectedPortfolio ||
      !selectedPortfolio.assets ||
      selectedPortfolio.assets.length === 0
    ) {
      return [];
    }

    const assets = selectedPortfolio.assets;
    const totalValue = assets.reduce(
      (sum, asset) => sum + asset.amount * (asset.currentPrice || 0),
      0
    );

    if (totalValue === 0) return [];

    const allocationByType: { [key: string]: number } = {};
    assets.forEach((asset) => {
      const value = asset.amount * (asset.currentPrice || 0);
      const type = asset.type;

      if (!allocationByType[type]) {
        allocationByType[type] = 0;
      }

      allocationByType[type] += value;
    });

    return Object.entries(allocationByType)
      .map(([type, value]: [string, number]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
        value,
        percentage: (value / totalValue) * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  };

  const assetAllocation = getAssetAllocation();

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-500";
      case "moderate":
        return "bg-yellow-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading && !selectedPortfolio) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)] flex-col gap-4">
        <div className="terminal-spinner w-12 h-12"></div>
        <p className="text-[var(--color-text-secondary)] text-sm uppercase tracking-wider">Loading portfolio data...</p>
      </div>
    );
  }

  // Color schemes for charts
  // Theme-only palette; dynamic gradients removed to keep consistency
  // const chartColors: string[] = [];

  return (
    <ResponsiveContainer>
      <div className="space-y-5 sm:space-y-6 mb-16 sm:mb-0">
        {/* Portfolio Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center mb-2">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
              Portfolio Dashboard
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {selectedPortfolio?.description ||
                "Your investment portfolio overview"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-full bg-secondary backdrop-blur-sm p-0.5 border border-border">
              {portfolios.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPortfolio(p.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all",
                    selectedPortfolio?.id === p.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <ResponsiveCard
            variant="glass"
            size="sm"
            withHover
            className="relative overflow-hidden"
          >
            {/* decorative circle removed */}
            <ResponsiveCardHeader>
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Total Value</p>
            </ResponsiveCardHeader>
            <ResponsiveCardContent>
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-accent-primary)] font-mono font-variant-numeric-tabular">
                  $
                  {stats.totalValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>
                <div className="flex items-center text-xs text-[var(--color-alert-green)] mt-1 font-mono font-variant-numeric-tabular">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +$489.53 (1.68%)
                </div>
              </div>
              {/* decorative icon removed */}
            </ResponsiveCardContent>
          </ResponsiveCard>

          <ResponsiveCard
            variant="glass"
            size="sm"
            withHover
            className="relative overflow-hidden"
          >
            {/* decorative circle removed */}
            <ResponsiveCardHeader>
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">24h Change</p>
            </ResponsiveCardHeader>
            <ResponsiveCardContent>
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-accent-primary)] font-mono font-variant-numeric-tabular">
                  $
                  {stats.dayChange.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>
                <div className="flex items-center text-xs text-[var(--color-alert-green)] mt-1 font-mono font-variant-numeric-tabular">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.dayChangePercent.toFixed(2)}%
                </div>
              </div>
              {/* decorative icon removed */}
            </ResponsiveCardContent>
          </ResponsiveCard>

          <ResponsiveCard
            variant="glass"
            size="sm"
            withHover
            className="relative overflow-hidden"
          >
            {/* decorative circle removed */}
            <ResponsiveCardHeader>
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Cumulative Return</p>
            </ResponsiveCardHeader>
            <ResponsiveCardContent>
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-accent-primary)] font-mono font-variant-numeric-tabular">
                  {stats.cumulativeReturn.toFixed(2)}%
                </h3>
                <div className="flex items-center text-xs text-[var(--color-alert-green)] mt-1 font-mono font-variant-numeric-tabular">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +1.2% this month
                </div>
              </div>
              {/* decorative icon removed */}
            </ResponsiveCardContent>
          </ResponsiveCard>

          <ResponsiveCard
            variant="glass"
            size="sm"
            withHover
            className="relative overflow-hidden"
          >
            {/* decorative circle removed */}
            <ResponsiveCardHeader>
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Active Strategies</p>
            </ResponsiveCardHeader>
            <ResponsiveCardContent>
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-accent-primary)] font-mono font-variant-numeric-tabular">
                  {selectedPortfolio?.strategies?.filter((s) => s.isActive)
                    .length || 0}
                </h3>
                <div className="flex items-center text-xs text-[var(--color-text-tertiary)] mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Last modified: 2d ago
                </div>
              </div>
              {/* decorative icon removed */}
            </ResponsiveCardContent>
          </ResponsiveCard>
        </div>

        {/* Portfolio Chart */}
        <ResponsiveCard variant="glass" size="lg" withHover>
          <ResponsiveCardHeader withBorder>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center w-full gap-3">
              <ResponsiveCardTitle className="text-[var(--color-text-primary)] uppercase tracking-wider">
                Portfolio Performance
              </ResponsiveCardTitle>
              <div className="flex items-center space-x-1 bg-secondary rounded-full p-0.5">
                {["1D", "1W", "1M", "3M", "1Y", "ALL"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      "px-2 py-1 text-xs rounded-full transition-colors",
                      timeframe === tf
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </ResponsiveCardHeader>
          <ResponsiveCardContent>
              <div className="h-60 w-full">
                {/* Chart SVG - Placeholder for actual chart component */}
                <div className="h-full w-full relative rounded-lg overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] terminal-grid">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 600 240"
                    preserveAspectRatio="none"
                    className="text-[var(--color-accent-primary)]"
                  >
                    <path
                      d="M0,200 C100,180 150,100 200,120 C250,140 300,80 350,60 C400,40 450,60 500,40 C550,20 600,10 600,10"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0,200 C100,180 150,100 200,120 C250,140 300,80 350,60 C400,40 450,60 500,40 C550,20 600,10 600,10 L600,240 L0,240 Z"
                      fill="url(#areaGradient)"
                      strokeWidth="0"
                    />
                    <defs>
                      <linearGradient
                        id="lineGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="var(--color-accent-primary)" />
                        <stop offset="100%" stopColor="var(--color-accent-secondary)" />
                      </linearGradient>
                      <linearGradient
                        id="areaGradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-accent-primary)"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-accent-primary)"
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 py-2 text-xs text-[var(--color-text-secondary)] font-mono">
                    {Array(8)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i}>
                          {chartData.labels?.[
                            i * Math.ceil(chartData.labels?.length / 8)
                          ] || `Jul ${22 + i}`}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
          </ResponsiveCardContent>
        </ResponsiveCard>

        {/* Two column layout for larger screens, stacked for mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Assets Table */}
          <div className="lg:col-span-2">
            <ResponsiveCard variant="glass" size="md" className="h-full">
              <ResponsiveCardHeader withBorder>
                <div className="flex items-center justify-between w-full">
                  <ResponsiveCardTitle className="text-[var(--color-text-primary)] uppercase tracking-wider">
                    Assets
                  </ResponsiveCardTitle>
                  <button className="inline-flex items-center px-2.5 py-1.5 text-xs rounded-md bg-[rgb(210,113,254)] text-black shadow-sm hover:brightness-110 transition-all">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Asset
                  </button>
                </div>
              </ResponsiveCardHeader>
              <ResponsiveCardContent>
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-[var(--color-bg-highlight)] border-b border-[var(--color-border)]">
                        <th className="py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          Asset
                        </th>
                        {!isMobile && (
                          <th className="py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Price
                          </th>
                        )}
                        <th className="py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          Holdings
                        </th>
                        <th className="py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          Value
                        </th>
                        {!isMobile && (
                          <th className="py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Alloc.
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {selectedPortfolio?.assets
                        .slice(0, isMobile ? 5 : undefined)
                        .map((asset) => {
                          const value =
                            asset.amount * (asset.currentPrice || 0);
                          const totalValue = selectedPortfolio.assets.reduce(
                            (sum, a) => sum + a.amount * (a.currentPrice || 0),
                            0
                          );
                          const allocation =
                            totalValue > 0 ? (value / totalValue) * 100 : 0;
                          return (
                            <tr
                              key={asset.id}
                              className="hover:bg-[var(--color-bg-highlight)] transition-colors group border-b border-[var(--color-border)]"
                            >
                              <td className="py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div
                                    className={`h-6 w-6 rounded-full flex items-center justify-center bg-[var(--color-accent-primary)]/20 mr-2 text-[var(--color-accent-primary)] font-mono font-semibold text-xs`}
                                  >
                                    {asset.symbol.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                                      {asset.symbol}
                                    </div>
                                    <div className="text-xs text-[var(--color-text-secondary)]">
                                      {asset.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {!isMobile && (
                                <td className="py-3 whitespace-nowrap text-right text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
                                  $
                                  {asset.currentPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              )}
                              <td className="py-3 whitespace-nowrap text-right text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
                                {asset.amount.toLocaleString("en-US", {
                                  minimumFractionDigits:
                                    asset.type === "stablecoin" ? 2 : 6,
                                  maximumFractionDigits:
                                    asset.type === "stablecoin" ? 2 : 6,
                                })}
                              </td>
                              <td className="py-3 whitespace-nowrap text-right text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
                                $
                                {value.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              {!isMobile && (
                                <td className="py-3 whitespace-nowrap text-right text-sm">
                                  <div className="flex items-center justify-end">
                                    <span className="mr-2 text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
                                      {allocation.toFixed(1)}%
                                    </span>
                                    <div className="w-12 bg-[var(--color-bg-highlight)] rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full bg-[var(--color-accent-primary)]`}
                                        style={{ width: `${allocation}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                      {isMobile &&
                        selectedPortfolio?.assets?.length &&
                        selectedPortfolio.assets.length > 5 && (
                          <tr>
                            <td colSpan={4} className="text-center py-2">
                              <button className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center justify-center w-full uppercase tracking-wider">
                                View all {selectedPortfolio?.assets?.length}{" "}
                                assets
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </button>
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </ResponsiveCardContent>
            </ResponsiveCard>
          </div>

          {/* Right column */}
          <div className="space-y-5 sm:space-y-6">
            {/* Asset Allocation */}
            <ResponsiveCard variant="glass" size="md">
              <ResponsiveCardHeader withBorder>
                <ResponsiveCardTitle className="text-black">
                  Asset Allocation
                </ResponsiveCardTitle>
              </ResponsiveCardHeader>
              <ResponsiveCardContent>
                <div className="space-y-3">
                  {assetAllocation.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-sm">{item.type}</span>
                        <span className="text-sm font-medium">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-primary`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-sm transition-colors text-foreground flex items-center justify-center">
                  {/* icon removed */}
                  Optimize Allocation
                </button>
              </ResponsiveCardContent>
            </ResponsiveCard>

            {/* Strategies */}
            <ResponsiveCard variant="glass" size="md">
              <ResponsiveCardHeader withBorder>
                <div className="flex items-center justify-between w-full">
                  <ResponsiveCardTitle className="text-black">
                    Strategies
                  </ResponsiveCardTitle>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Add
                  </button>
                </div>
              </ResponsiveCardHeader>
              <ResponsiveCardContent>
                <div className="space-y-3">
                  {selectedPortfolio?.strategies
                    ?.slice(0, isMobile ? 2 : 3)
                    .map((strategy) => (
                      <div
                        key={strategy.id}
                        className="p-3 rounded-lg bg-secondary border border-border hover:border-primary transition-all group"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                            {strategy.name}
                          </h3>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              strategy.isActive
                                ? "bg-primary/10 text-primary border border-primary/30"
                                : "bg-destructive/10 text-destructive border border-destructive/30"
                            )}
                          >
                            {strategy.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground my-1.5">
                          {strategy.description}
                        </p>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-black">Allocation</span>
                          <span>{strategy.targetAllocation}%</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-black">Risk Level</span>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                getRiskColor(strategy.riskLevel || "low")
                              )}
                            ></div>
                            <span>
                              {strategy.riskLevel
                                ? strategy.riskLevel.charAt(0).toUpperCase() +
                                  strategy.riskLevel.slice(1)
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {(!selectedPortfolio?.strategies ||
                    selectedPortfolio.strategies.length === 0) && (
                    <div className="text-center py-6 flex flex-col items-center">
                      <div className="mb-3 bg-primary/10 rounded-full p-3">
                        <PieChart className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm text-black">
                        No strategies configured yet
                      </p>
                      <button className="mt-2 text-xs text-black hover:opacity-80 transition-colors">
                        Add your first strategy
                      </button>
                    </div>
                  )}
                </div>

                {selectedPortfolio?.strategies &&
                  selectedPortfolio.strategies.length > 0 && (
                    <button className="mt-3 w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-xs transition-colors text-foreground flex items-center justify-center">
                      View All Strategies
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </button>
                  )}
              </ResponsiveCardContent>
            </ResponsiveCard>

            {/* Recent Transactions */}
            <ResponsiveCard
              variant="glass"
              size="md"
              className={isMobile ? "mb-20" : ""}
            >
              <ResponsiveCardHeader withBorder>
                <div className="flex items-center justify-between w-full">
                  <ResponsiveCardTitle className="text-black">
                    Recent Transactions
                  </ResponsiveCardTitle>
                  <Link
                    href="/portfolio/transactions"
                    className="text-xs text-black hover:text-black transition-colors flex items-center"
                  >
                    View All
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              </ResponsiveCardHeader>
              <ResponsiveCardContent>
                <div className="space-y-3">
                  <div className="flex items-center border-b border-gray-800/30 pb-3">
                    <div className="h-8 w-8 rounded-full bg-black/10 border border-black/30 flex items-center justify-center mr-3">
                      <TrendingUp className="h-4 w-4 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Buy BTC</p>
                        <p className="text-sm font-medium text-black">
                          +0.05 BTC
                        </p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center text-black">
                          <Clock className="h-3 w-3 mr-1" />2 days ago
                        </div>
                        <p className="text-black">$1,982.45</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center border-b border-gray-800/30 pb-3">
                    <div className="h-8 w-8 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mr-3">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Sell ETH</p>
                        <p className="text-sm font-medium text-destructive">
                          -1.5 ETH
                        </p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center text-black">
                          <Clock className="h-3 w-3 mr-1" />5 days ago
                        </div>
                        <p className="text-black">$2,894.32</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center mr-3">
                      <Settings className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Rebalance</p>
                        <p className="text-sm font-medium">Auto</p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center text-black">
                          <Clock className="h-3 w-3 mr-1" />1 week ago
                        </div>
                        <p className="text-black">Strategy Update</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ResponsiveCardContent>
            </ResponsiveCard>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
