"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useResearchStore } from "@/lib/stores/research-store";
import { GlassPanel } from "@/components/ui/glass-panel";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { GlassChart } from "@/components/ui/glass-chart";
import { cn } from "@/lib/utils";
import { TopProtocols } from "@/lib/types/research";
import { mockMarketData } from "@/lib/data";
import { marketInsights } from "@/lib/data";

export default function IntelligenceDashboardPage() {
  const { protocols } = useResearchStore();
  const [loading, setLoading] = useState(true);

  // Mock chart data with explicit types
  const [marketData, setMarketData] = useState(mockMarketData);

  // Top protocols by category
  const topProtocolsByCategory = protocols.reduce(
    (acc: TopProtocols, protocol) => {
      if (
        !acc[protocol.category] ||
        (acc[protocol.category].apy || 0) < (protocol.apy || 0)
      ) {
        acc[protocol.category] = protocol;
      }
      return acc;
    },
    {}
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500/20 text-green-300";
    if (confidence >= 60) return "bg-yellow-500/20 text-yellow-300";
    return "bg-red-500/20 text-red-300";
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-normal mb-6 text-gradient-primary">
        Intelligence Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="Total Value Locked Trends"
          icon={<span className="text-xl">📊</span>}
          loading={loading}
        >
          {marketData && (
            <div className="h-64">
              <GlassChart
                data={marketData.tvlData.data}
                labels={marketData.tvlData.labels}
                color="primary"
              />
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="APY Trends by Category"
          icon={<span className="text-xl">📈</span>}
          loading={loading}
        >
          {marketData && (
            <div className="h-64 space-y-2 overflow-y-auto pr-2">
              {marketData.apyTrends.datasets.map((dataset, index) => (
                <div key={dataset.name}>
                  <h4 className="text-sm font-medium text-white/80 mb-1">
                    {dataset.name}
                  </h4>
                  <GlassChart
                    data={dataset.data}
                    height={60}
                    showPoints={false}
                    color={
                      ["primary", "secondary", "accent"][index % 3] as
                        | "primary"
                        | "secondary"
                        | "accent"
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      <DashboardCard
        title="Risk/Reward Matrix"
        icon={<span className="text-xl">⚖️</span>}
        loading={loading}
      >
        {marketData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {marketData.riskMatrix.categories.map((category, index) => (
              <GlassPanel key={category} className="p-3">
                <div className="font-medium text-white/90">{category}</div>
                <div className="text-sm text-white/60 mt-1">
                  Risk:{" "}
                  <span className="font-normal text-red-400">
                    {marketData.riskMatrix.risk[index]}
                  </span>
                </div>
                <div className="text-sm text-white/60">
                  Reward:{" "}
                  <span className="font-normal text-green-400">
                    {marketData.riskMatrix.reward[index]}
                  </span>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
        <div className="mt-4 text-center text-sm text-white/70">
          <p>
            Yield protocols offer highest rewards with moderate risk, while DEXs
            provide balanced risk-reward profiles.
          </p>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Market Insights"
        icon={<span className="text-xl">🔍</span>}
        loading={loading}
      >
        <div className="space-y-4">
          {marketInsights.map((insight) => (
            <GlassPanel key={insight.id} className="p-4" bordered>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{insight.title}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10">
                    {insight.category}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      getConfidenceColor(insight.confidence)
                    )}
                  >
                    {insight.confidence}% Confidence
                  </span>
                </div>
              </div>
              <p className="text-sm text-white/70">{insight.analysis}</p>
              <div className="mt-2 text-xs text-white/50">
                {new Date(insight.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </GlassPanel>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Top Protocols by APY"
        icon={<span className="text-xl">🏆</span>}
        loading={loading}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(topProtocolsByCategory).map(
            ([category, protocol]) => (
              <GlassPanel key={category} className="p-4" interactive>
                <div className="flex items-center space-x-3 mb-3">
                  {protocol.logoUrl && (
                    <Image
                      src={protocol.logoUrl}
                      alt={`${protocol.name} logo`}
                      width={32}
                      height={32}
                      className="rounded-full object-contain"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{protocol.name}</h3>
                    <div className="text-xs text-white/60">{category}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-white/60">APY</div>
                    <div className="font-medium text-success">
                      {(protocol.apy || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Risk</div>
                    <div className="font-medium">
                      {(protocol.riskScore || 0).toFixed(1)}/10
                    </div>
                  </div>
                </div>
              </GlassPanel>
            )
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
