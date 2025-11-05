import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { RISK_QUESTIONNAIRE } from "./constants";

// Calculates risk score from questionnaire responses
export function calculateRiskScore(responses: string[]) {
  let totalPoints = 0;
  const responseDetails: Array<{
    questionId: number;
    question: string;
    selectedAnswer: string;
    points: number;
  }> = [];

  // Use shared questionnaire

  responses.forEach((response, index) => {
    const question = RISK_QUESTIONNAIRE.questions[index];
    const selectedOption = question.options.find(
      (opt) => opt.value === response
    );

    if (selectedOption) {
      totalPoints += selectedOption.points;
      responseDetails.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer: selectedOption.text,
        points: selectedOption.points,
      });
    }
  });

  const rawPoints = totalPoints;
  const riskScore = ((rawPoints - 5) / 20) * 10;
  const normalizedRiskScore = Math.max(0, Math.min(10, riskScore));

  const riskCategories = [
    {
      min: 0,
      max: 3,
      category: "Ultra-Conservative",
      aggressiveness: 0.7,
      description: "Prefer stability; scale down allocations by 30%",
    },
    {
      min: 3,
      max: 6,
      category: "Moderate",
      aggressiveness: 1.0,
      description: "Neutral stance; use full budget",
    },
    {
      min: 6,
      max: 10,
      category: "Aggressive",
      aggressiveness: 1.3,
      description: "Chase yields; boost allocations by 30%",
    },
  ];

  const category = riskCategories.find(
    (cat) => normalizedRiskScore >= cat.min && normalizedRiskScore <= cat.max
  );

  return {
    rawPoints,
    riskScore: normalizedRiskScore,
    category: category?.category || "Unknown",
    aggressiveness: category?.aggressiveness || 1.0,
    description: category?.description || "Unknown risk profile",
    responseDetails,
  };
}

// Creates a complete risk profile JSON
export function createRiskProfile(
  riskAssessment: any,
  userInfo: {
    walletAddress?: string;
    chainId?: string;
    [key: string]: any;
  } = {}
) {
  const timestamp = new Date().toISOString();
  const recommendations = {
    allocationStrategy:
      riskAssessment.aggressiveness === 0.7
        ? "Conservative"
        : riskAssessment.aggressiveness === 1.0
        ? "Moderate"
        : "Aggressive",
    maxDeFiExposure:
      riskAssessment.aggressiveness === 0.7
        ? "10-15%"
        : riskAssessment.aggressiveness === 1.0
        ? "20-30%"
        : "40-50%",
    protocolSelection:
      riskAssessment.aggressiveness === 0.7
        ? "Established protocols only"
        : riskAssessment.aggressiveness === 1.0
        ? "Mix of established and emerging"
        : "Include experimental protocols",
    riskManagement:
      riskAssessment.aggressiveness === 0.7
        ? "High diversification, low leverage"
        : riskAssessment.aggressiveness === 1.0
        ? "Moderate diversification"
        : "Concentrated positions acceptable",
  };

  return {
    profileId: `risk_profile_${Date.now()}`,
    timestamp,
    userInfo: {
      walletAddress: userInfo.walletAddress || "unknown",
      chainId: userInfo.chainId || "unknown",
      ...userInfo,
    },
    riskAssessment: {
      rawPoints: riskAssessment.rawPoints,
      riskScore: riskAssessment.riskScore,
      category: riskAssessment.category,
      aggressiveness: riskAssessment.aggressiveness,
      description: riskAssessment.description,
    },
    questionnaire: {
      totalQuestions: RISK_QUESTIONNAIRE.questions.length,
      responses: riskAssessment.responseDetails,
      questions: RISK_QUESTIONNAIRE.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
    },
    recommendations,
    metadata: {
      version: "1.0",
      calculationMethod: "5-question risk tolerance questionnaire",
      scoreRange: "0-10",
      aggressivenessRange: "0.7-1.3",
    },
  };
}

// Fetch Compound Finance data using AgentKit with LangChain tools
export async function fetchCompoundData(agentkit: any) {
  const tools = await getLangChainTools(agentkit);
  let findProtocolTool: any = null;
  let getProtocolTool: any = null;

  if (Array.isArray(tools)) {
    findProtocolTool = tools.find(
      (tool: any) =>
        ((tool as any).name && (tool as any).name.includes("find_protocol")) ||
        (((tool as any).schema as any)?.name &&
          ((tool as any).schema as any).name.includes("find_protocol"))
    );
    getProtocolTool = tools.find(
      (tool: any) =>
        ((tool as any).name && (tool as any).name.includes("get_protocol")) ||
        (((tool as any).schema as any)?.name &&
          ((tool as any).schema as any).name.includes("get_protocol"))
    );
  } else if (tools && typeof tools === "object") {
    const toolsObj: any = tools as any;
    findProtocolTool =
      toolsObj.find_protocol || toolsObj.DefiLlamaActionProvider_find_protocol;
    getProtocolTool =
      toolsObj.get_protocol || toolsObj.DefiLlamaActionProvider_get_protocol;
  }

  if (!findProtocolTool || !getProtocolTool) {
    throw new Error("DeFiLlama protocol tools not available");
  }

  let findResult: any;
  if (typeof findProtocolTool.invoke === "function") {
    findResult = await findProtocolTool.invoke({ query: "compound" });
  } else if (typeof findProtocolTool.call === "function") {
    findResult = await findProtocolTool.call({ query: "compound" });
  } else if (typeof findProtocolTool.run === "function") {
    findResult = await findProtocolTool.run({ query: "compound" });
  } else if (typeof findProtocolTool === "function") {
    findResult = await findProtocolTool({ query: "compound" });
  } else {
    throw new Error("No valid method found to call find_protocol tool");
  }
  findResult = JSON.parse(findResult);

  if (!findResult || findResult.length === 0) {
    throw new Error("No Compound protocol found");
  }

  const firstResult = findResult[0];
  const protocolId = firstResult["parentProtocolSlug"];

  let getResult: any;
  if (typeof getProtocolTool.invoke === "function") {
    getResult = await getProtocolTool.invoke({ protocolId });
  } else if (typeof getProtocolTool.call === "function") {
    getResult = await getProtocolTool.call({ protocol: protocolId });
  } else if (typeof getProtocolTool.run === "function") {
    getResult = await getProtocolTool.run({ protocol: protocolId });
  } else if (typeof getProtocolTool === "function") {
    getResult = await getProtocolTool({ protocol: protocolId });
  } else {
    throw new Error("No valid method found to call get_protocol tool");
  }

  const compoundData = JSON.parse(getResult);
  const tvlData = compoundData.tvl || [];
  const currentTvl = tvlData.length > 0 ? tvlData[0].totalLiquidityUSD : 0;
  const previousTvl =
    tvlData.length > 1 ? tvlData[1].totalLiquidityUSD : currentTvl * 0.99;
  const actualChainTvls = compoundData.currentChainTvls || {};
  const actualTokensInUsd = compoundData.tokensInUsd || [];

  return {
    id: "compound-finance",
    name: "Compound Finance",
    protocol: "compound",
    vaultName: null,
    vaultAddress: null,
    supplyApy: 3.2,
    rewardApy: 1.5,
    tvl: [
      { totalLiquidityUSD: currentTvl },
      { totalLiquidityUSD: previousTvl },
    ],
    currentChainTvls: actualChainTvls,
    tokensInUsd: actualTokensInUsd,
    collaterals: [],
    manualSecurity: 5,
    manualGovernance: 4,
  };
}

// Fetch Morpho Vaults via GraphQL
export async function fetchMorphoVaults() {
  const GRAPHQL_URL = "https://api.morpho.org/graphql";
  const query = `
    query {
      vaults(
        first: 100,
        where: { chainId_in: [8453] },
        orderBy: TotalAssetsUsd,
        orderDirection: Desc
      ) {
        items { address symbol name whitelisted asset { id address decimals } chain { id network } state { apy netApy allocation { supplyAssetsUsd } }
        }
      }
    }
  `;
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
  const { data } = await res.json();
  return data.vaults.items || [];
}

export function filterVaultsByRiskProfile(vaults: any[], riskProfile: any) {
  const aggressiveness = riskProfile.riskAssessment.aggressiveness;
  return vaults.filter((vault) => {
    const allocations = vault.state?.allocation || [];
    const tvlUsd = allocations.reduce(
      (total: number, alloc: any) => total + (alloc.supplyAssetsUsd || 0),
      0
    );
    const isWhitelisted = vault.whitelisted || false;
    const chainNetwork = vault.chain?.network || "unknown";
    const apy = vault.state?.apy || 0;
    const netApy = vault.state?.netApy || 0;

    if (tvlUsd < 1000) return false;
    if (!isWhitelisted) return false;

    if (aggressiveness <= 0.7) {
      const establishedChains = ["ethereum", "base", "arbitrum", "polygon"];
      if (!establishedChains.includes(chainNetwork.toLowerCase())) return false;
      if (tvlUsd < 1_000_000) return false;
      if (apy > 20) return false;
      if (netApy < 1) return false;
    } else if (aggressiveness <= 1.0) {
      const moderateChains = [
        "ethereum",
        "base",
        "arbitrum",
        "polygon",
        "optimism",
      ];
      if (!moderateChains.includes(chainNetwork.toLowerCase())) return false;
      if (tvlUsd < 100_000) return false;
      if (apy > 50) return false;
    } else {
      if (tvlUsd < 10_000) return false;
      if (apy > 100) return false;
    }
    return true;
  });
}

export function morphoVaultsToProtocols(vaults: any[]) {
  return vaults.map((v) => {
    const symbol =
      v.symbol ||
      (v.asset && v.asset.id) ||
      (v.address ? v.address.slice(0, 6) + "..." : "UNKNOWN");
    const name = v.name || `Morpho ${symbol} Vault`;
    const chain =
      v.chain && v.chain.network ? v.chain.network : "unknown-chain";
    const netApy = v.state?.netApy || 0;
    const totalApy = v.state?.apy || 0;
    const rewardApy = totalApy - netApy;
    const allocations = v.state?.allocation || [];
    const tvlUsd = allocations.reduce(
      (total: number, alloc: any) => total + (alloc.supplyAssetsUsd || 0),
      0
    );
    return {
      id: `morpho-vault-${symbol}-${chain}`,
      name: `${name} (${chain})`,
      protocol: "morpho",
      vaultName: name,
      vaultAddress: v.address,
      supplyApy: netApy,
      rewardApy,
      tvl: [{ totalLiquidityUSD: tvlUsd }],
      currentChainTvls: { supplied: tvlUsd, borrowed: 0 },
      tokensInUsd: [{ tokens: { [symbol]: tvlUsd } }],
      collaterals: [],
      manualSecurity: 4,
      manualGovernance: 3,
    };
  });
}

export function computeRawMetrics(protocols: any[]) {
  return protocols.map((p) => {
    const apy = (p.supplyApy || 0) + (p.rewardApy || 0);
    const totalBorrowed = p.currentChainTvls?.borrowed || 0;
    const totalSupplied =
      p.tvl && p.tvl.length > 0
        ? p.tvl[0].totalLiquidityUSD
        : Object.values(p.currentChainTvls || {})
            .filter((v: any) => typeof v === "number")
            .reduce((sum: number, v: any) => sum + v, 0);
    const utilization = totalSupplied > 0 ? totalBorrowed / totalSupplied : 0;

    const tvlSeries = p.tvl || [];
    let tvlMomentum = 0;
    if (tvlSeries.length >= 2) {
      const today = tvlSeries[0].totalLiquidityUSD;
      const weekAgo = tvlSeries[tvlSeries.length - 1].totalLiquidityUSD;
      tvlMomentum = weekAgo > 0 ? (today - weekAgo) / weekAgo : 0;
    }

    let collCushion = 0;
    if (p.collaterals && p.tokensInUsd && p.tvl && p.tvl[0]) {
      const tvlTotal = p.tvl[0].totalLiquidityUSD;
      collCushion = p.collaterals.reduce((sum: number, c: any) => {
        const w = (p.tokensInUsd[0].tokens[c.token] || 0) / tvlTotal;
        return (
          sum + w * ((c.collateralFactor || 0) - (c.liquidationThreshold || 0))
        );
      }, 0);
    }

    const tvlTotalMain = p.tvl && p.tvl[0] ? p.tvl[0].totalLiquidityUSD : 1;
    const tokensUsd =
      p.tokensInUsd && p.tokensInUsd[0] ? p.tokensInUsd[0].tokens : {};
    const sortedValues = Object.values(tokensUsd).sort(
      (a: any, b: any) => (b as number) - (a as number)
    );
    const top5Sum = (sortedValues as number[])
      .slice(0, 5)
      .reduce((a, b) => a + b, 0);
    const concentration = top5Sum / tvlTotalMain;

    const chainKeys = Object.keys(p.currentChainTvls || {}).filter(
      (k) => k !== "borrowed"
    );
    const chainTotals = chainKeys.map((k) => p.currentChainTvls[k] || 0);
    const sumChains = chainTotals.reduce((a: number, b: any) => a + b, 0) || 1;
    const hhi = chainTotals
      .map((val) => (val / sumChains) ** 2)
      .reduce((a: number, b: number) => a + b, 0);

    return {
      id: p.id,
      name: p.name,
      protocol: p.protocol,
      vaultName: p.vaultName,
      vaultAddress: p.vaultAddress,
      raw: { apy, utilization, tvlMomentum, collCushion, concentration, hhi },
      manual: {
        security: p.manualSecurity || 3,
        governance: p.manualGovernance || 3,
      },
    };
  });
}

export function normalizeMetrics(metricsArray: any[]) {
  const keys = [
    "apy",
    "utilization",
    "tvlMomentum",
    "collCushion",
    "concentration",
    "hhi",
  ];
  const manualKeys = ["security", "governance"];
  const allKeys = [...keys, ...manualKeys];

  const stats = allKeys.reduce((acc: any, k) => {
    const vals = metricsArray.map((p) => {
      if (keys.includes(k)) return p.raw[k] != null ? p.raw[k] : 0;
      return p.manual[k] != null ? p.manual[k] : 0;
    });
    acc[k] = { min: Math.min(...vals), max: Math.max(...vals) };
    return acc;
  }, {});

  return metricsArray.map((p) => {
    const N: any = {};
    keys.forEach((k) => {
      const v = p.raw[k] != null ? p.raw[k] : stats[k].min;
      const { min, max } = stats[k];
      if (max > min) {
        if (["utilization", "concentration", "hhi"].includes(k)) {
          N[k] = 1 - (v - min) / (max - min);
        } else {
          N[k] = (v - min) / (max - min);
        }
      } else N[k] = 0.5;
    });
    manualKeys.forEach((k) => {
      const v = p.manual[k];
      const { min, max } = stats[k];
      N[k] = max > min ? (v - min) / (max - min) : 0.5;
    });
    return {
      id: p.id,
      name: p.name,
      N,
      protocolData: {
        protocol: p.protocol || "unknown",
        vaultName: p.vaultName || null,
        vaultAddress: p.vaultAddress || null,
      },
    };
  });
}

export function computeAllocation(
  normalized: any[],
  weights: any,
  budget: number
) {
  const scores = normalized.map((p) => {
    const S = Object.entries(weights).reduce(
      (sum: number, [k, w]) => sum + (p.N[k] || 0) * (w as number),
      0
    );
    return { id: p.id, name: p.name, score: S };
  });
  const totalScore =
    scores.reduce((sum: number, p: any) => sum + p.score, 0) || 1;
  return scores.map((p) => {
    const originalProtocol = normalized.find(
      (protocol) => protocol.id === p.id
    );
    const protocolData = originalProtocol
      ? originalProtocol.protocolData
      : null;
    return {
      id: p.id,
      name: p.name,
      protocol: protocolData?.protocol || "unknown",
      vaultName: protocolData?.vaultName || null,
      vaultAddress: protocolData?.vaultAddress || null,
      allocation: budget * (p.score / totalScore),
      percentage: (p.score / totalScore) * 100,
    };
  });
}

export async function computeMetricsAndAllocation(
  riskProfile: any,
  budget = 50000,
  agentkit: any = null
) {
  let parsedRiskProfile: any;
  if (typeof riskProfile === "string")
    parsedRiskProfile = JSON.parse(riskProfile);
  else parsedRiskProfile = riskProfile;

  const compoundProtocol = await fetchCompoundData(agentkit);
  const vaults = await fetchMorphoVaults();
  const filteredVaults = filterVaultsByRiskProfile(vaults, parsedRiskProfile);
  const morphoProtocols = morphoVaultsToProtocols(filteredVaults);
  const allProtocols = [compoundProtocol, ...morphoProtocols];
  const rawMetrics = computeRawMetrics(allProtocols);
  const normalized = normalizeMetrics(rawMetrics);

  let weights: any;
  if (parsedRiskProfile.riskAssessment.aggressiveness <= 0.7) {
    weights = {
      apy: 0.25,
      utilization: 0.2,
      tvlMomentum: 0.15,
      collCushion: 0.15,
      concentration: 0.1,
      hhi: 0.1,
      security: 0.05,
      governance: 0.05,
    };
  } else if (parsedRiskProfile.riskAssessment.aggressiveness <= 1.0) {
    weights = {
      apy: 0.35,
      utilization: 0.15,
      tvlMomentum: 0.15,
      collCushion: 0.1,
      concentration: 0.1,
      hhi: 0.1,
      security: 0.05,
      governance: 0.05,
    };
  } else {
    weights = {
      apy: 0.45,
      utilization: 0.1,
      tvlMomentum: 0.15,
      collCushion: 0.05,
      concentration: 0.1,
      hhi: 0.05,
      security: 0.05,
      governance: 0.05,
    };
  }

  const allocations = computeAllocation(normalized, weights, budget);
  let totalAllocated = 0;
  allocations.forEach((a: any) => (totalAllocated += a.allocation));
  return {
    riskProfile: parsedRiskProfile,
    allocations,
    totalAllocated,
    budget,
    utilization: totalAllocated / budget,
  };
}
