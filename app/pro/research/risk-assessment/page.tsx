"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useResearchStore, Protocol } from "@/lib/stores/research-store";
import { GlassPanel } from "@/components/ui/glass-panel";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { RiskAssessmentData } from "@/lib/types/research";
import RiskFactorBar from "@/components/RiskFactorBar";

export default function RiskAssessmentPage() {
  const { protocols } = useResearchStore();
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(
    null
  );
  const [assessmentData, setAssessmentData] = useState<
    Record<string, RiskAssessmentData>
  >({});

  useEffect(() => {
    if (protocols.length > 0) {
      const mockAssessments: Record<string, RiskAssessmentData> = {};
      protocols.forEach((protocol) => {
        mockAssessments[protocol.id] = {
          id: crypto.randomUUID(),
          protocolId: protocol.id,
          score: protocol.riskScore,
          factors: {
            auditScore: Math.min(
              10,
              Math.max(1, protocol.riskScore + (Math.random() * 2 - 1))
            ),
            tvlScore: Math.min(
              10,
              Math.max(1, 10 - protocol.tvl / 1e9 + Math.random() * 2)
            ),
            ageScore: Math.min(
              10,
              Math.max(1, protocol.riskScore + (Math.random() * 2 - 1))
            ),
            communityScore: Math.min(
              10,
              Math.max(1, protocol.riskScore - Math.random() * 3)
            ),
            codeQualityScore: Math.min(
              10,
              Math.max(1, protocol.riskScore - Math.random())
            ),
          },
          analysis: `${protocol.name} has a risk profile that is ${
            protocol.riskScore > 8
              ? "relatively low risk"
              : protocol.riskScore > 6
              ? "moderate risk"
              : "higher risk"
          }. The protocol ${
            protocol.audited
              ? "has been audited by reputable firms"
              : "lacks comprehensive audits"
          }, 
          and has a TVL of $${(protocol.tvl / 1e9).toFixed(
            2
          )}B. Key risk factors include contract complexity,
          centralization concerns, and market dynamics.`,
          date: new Date().toISOString(),
        };
      });
      setAssessmentData(mockAssessments);
      if (!selectedProtocol) {
        setSelectedProtocol(protocols[0]);
      }
      setLoading(false);
    }
  }, [protocols, selectedProtocol]);

  const getRiskRating = (score: number) => {
    if (score >= 8.5) return { text: "Very Low Risk", color: "text-green-400" };
    if (score >= 7.5) return { text: "Low Risk", color: "text-green-300" };
    if (score >= 6.5)
      return { text: "Moderate Risk", color: "text-yellow-300" };
    if (score >= 5.0) return { text: "High Risk", color: "text-orange-400" };
    return { text: "Very High Risk", color: "text-red-400" };
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-normal mb-6 text-gradient-primary">
        Protocol Risk Assessment
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <DashboardCard title="Select Protocol" loading={loading}>
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search protocols..."
                className="w-full p-2 bg-black/20 border border-white/10 rounded"
              />
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {protocols.map((protocol) => (
                <button
                  key={protocol.id}
                  className={`flex items-center w-full p-2 rounded text-left hover:bg-white/5 transition-colors ${
                    selectedProtocol?.id === protocol.id
                      ? "bg-primary-500/20"
                      : ""
                  }`}
                  onClick={() => setSelectedProtocol(protocol)}
                >
                  {protocol.logoUrl && (
                    <Image
                      src={protocol.logoUrl}
                      alt={protocol.name}
                      width={24}
                      height={24}
                      className="mr-3 rounded-full object-contain"
                    />
                  )}
                  <span className="flex-grow">{protocol.name}</span>
                  <span
                    className={`text-xs font-medium ${
                      getRiskRating(protocol.riskScore).color
                    }`}
                  >
                    {protocol.riskScore.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </DashboardCard>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedProtocol && assessmentData[selectedProtocol.id] ? (
            <>
              <DashboardCard
                title="Protocol Overview"
                icon={<span className="text-xl">📑</span>}
              >
                <GlassPanel className="p-6" bordered>
                  <div className="flex items-center mb-4">
                    {selectedProtocol.logoUrl && (
                      <Image
                        src={selectedProtocol.logoUrl}
                        alt={selectedProtocol.name}
                        width={48}
                        height={48}
                        className="rounded-full mr-4 object-contain"
                        style={{ objectFit: "contain" }}
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-normal">
                        {selectedProtocol.name}
                      </h2>
                      <p className="text-white/60">
                        {selectedProtocol.category}
                      </p>
                    </div>
                  </div>
                  <p className="text-white/80 mb-4">
                    {selectedProtocol.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs mb-4">
                    <span className="px-3 py-1 bg-white/5 rounded-full">
                      {selectedProtocol.chainName}
                    </span>
                    {selectedProtocol.audited && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full">
                        Audited
                      </span>
                    )}
                    <span className="px-3 py-1 bg-white/5 rounded-full">
                      {selectedProtocol.tvl > 1e9
                        ? "High Liquidity"
                        : selectedProtocol.tvl > 1e8
                        ? "Medium Liquidity"
                        : "Low Liquidity"}
                    </span>
                    <span className="px-3 py-1 bg-white/5 rounded-full">
                      {selectedProtocol.riskScore < 5
                        ? "Established Project"
                        : "New Project"}
                    </span>
                  </div>
                </GlassPanel>
              </DashboardCard>

              <DashboardCard
                title="Overall Risk Score"
                icon={<span className="text-xl">🛡️</span>}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 flex flex-col items-center justify-center">
                    <div
                      className={`text-6xl font-normal ${
                        getRiskRating(assessmentData[selectedProtocol.id].score)
                          .color
                      }`}
                    >
                      {assessmentData[selectedProtocol.id].score.toFixed(1)}
                    </div>
                    <div
                      className={`text-lg font-medium ${
                        getRiskRating(assessmentData[selectedProtocol.id].score)
                          .color
                      }`}
                    >
                      {
                        getRiskRating(assessmentData[selectedProtocol.id].score)
                          .text
                      }
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-white/80">
                      {assessmentData[selectedProtocol.id].analysis}
                    </p>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard
                title="Risk Factor Breakdown"
                icon={<span className="text-xl">📊</span>}
              >
                <div className="space-y-4">
                  <RiskFactorBar
                    name="Smart Contract Security"
                    score={
                      assessmentData[selectedProtocol.id].factors.auditScore
                    }
                    description="Based on audit history, known vulnerabilities, and contract complexity"
                  />
                  <RiskFactorBar
                    name="TVL & Liquidity"
                    score={assessmentData[selectedProtocol.id].factors.tvlScore}
                    description="Based on total value locked, liquidity depth, and historical stability"
                  />
                  <RiskFactorBar
                    name="Protocol Maturity"
                    score={assessmentData[selectedProtocol.id].factors.ageScore}
                    description="Based on time in market, track record, and historical incidents"
                  />
                  <RiskFactorBar
                    name="Community & Governance"
                    score={
                      assessmentData[selectedProtocol.id].factors.communityScore
                    }
                    description="Based on governance structure, community size, and decentralization"
                  />
                  <RiskFactorBar
                    name="Code Quality"
                    score={
                      assessmentData[selectedProtocol.id].factors
                        .codeQualityScore
                    }
                    description="Based on code quality, testing coverage, and documentation"
                  />
                </div>
              </DashboardCard>

              <DashboardCard
                title="Risk Mitigation Strategies"
                icon={<span className="text-xl">🔒</span>}
              >
                <div className="space-y-4">
                  <GlassPanel className="p-4" bordered>
                    <h3 className="font-medium mb-2">Position Sizing</h3>
                    <p className="text-sm text-white/70">
                      Based on the risk assessment, a recommended maximum
                      allocation of{" "}
                      <span className="font-semibold">
                        {selectedProtocol.riskScore >= 8
                          ? "2%"
                          : selectedProtocol.riskScore >= 7
                          ? "5%"
                          : selectedProtocol.riskScore >= 6
                          ? "10%"
                          : "15%"}
                      </span>{" "}
                      of your portfolio is advised for this protocol.
                    </p>
                  </GlassPanel>
                  <GlassPanel className="p-4" bordered>
                    <h3 className="font-medium mb-2">Insurance Coverage</h3>
                    <p className="text-sm text-white/70">
                      Consider insurance coverage through providers like Nexus
                      Mutual or InsurAce for protection against smart contract
                      failures and hacks. Estimated coverage cost is
                      approximately 2.5% of position value annually.
                    </p>
                    <div className="flex mt-2">
                      <button className="text-xs px-3 py-1 bg-primary-500/20 rounded hover:bg-primary-500/30 transition-colors">
                        View Insurance Options
                      </button>
                    </div>
                  </GlassPanel>
                  <GlassPanel className="p-4" bordered>
                    <h3 className="font-medium mb-2">Monitoring Plan</h3>
                    <p className="text-sm text-white/70">
                      Set up monitoring alerts for significant changes in
                      protocol TVL, governance proposals, and security updates.
                      Monitor on-chain activity for unusual patterns.
                    </p>
                    <div className="flex mt-2">
                      <button className="text-xs px-3 py-1 bg-primary-500/20 rounded hover:bg-primary-500/30 transition-colors">
                        Set Up Alerts
                      </button>
                    </div>
                  </GlassPanel>
                </div>
              </DashboardCard>

              <DashboardCard
                title="Risk Comparison"
                icon={<span className="text-xl">⚖️</span>}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {protocols
                    .filter(
                      (p) =>
                        p.category === selectedProtocol.category &&
                        p.id !== selectedProtocol.id
                    )
                    .slice(0, 3)
                    .map((protocol) => (
                      <GlassPanel
                        key={protocol.id}
                        className="p-4"
                        interactive
                        bordered
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          {protocol.logoUrl && (
                            <Image
                              src={protocol.logoUrl}
                              alt={protocol.name}
                              width={32}
                              height={32}
                              className="rounded-full object-contain"
                              style={{ objectFit: "contain" }}
                            />
                          )}
                          <div>
                            <h3 className="font-semibold">{protocol.name}</h3>
                            <div className="text-xs text-white/60">
                              {protocol.category}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-white/60">
                              Risk Score
                            </div>
                            <div
                              className={`font-medium ${
                                getRiskRating(protocol.riskScore).color
                              }`}
                            >
                              {protocol.riskScore.toFixed(1)}/10
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-white/60">APY</div>
                            <div className="font-medium text-success">
                              {protocol.apy.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedProtocol(protocol)}
                          className="w-full mt-3 px-3 py-2 text-sm bg-primary-500/20 rounded hover:bg-primary-500/30 transition-colors"
                        >
                          View Assessment
                        </button>
                      </GlassPanel>
                    ))}
                </div>
              </DashboardCard>
            </>
          ) : (
            <div className="lg:col-span-3 flex items-center justify-center h-full">
              <GlassPanel className="p-8 text-center">
                <p className="text-2xl mb-2">🔍</p>
                <h3 className="text-lg font-semibold mb-2">
                  Select a Protocol
                </h3>
                <p className="text-white/60">
                  Choose a protocol from the list to view its detailed risk
                  assessment.
                </p>
              </GlassPanel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
