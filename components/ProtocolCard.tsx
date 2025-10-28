import { Protocol } from "@/lib/stores/research-store";
import { ResponsiveCard } from "@/components/molecule/responsive-card";
import { Star, Shield, TrendingUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ProtocolCardProps {
  protocol: Protocol;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const ProtocolCard = ({
  protocol,
  isFavorite,
  onToggleFavorite,
}: ProtocolCardProps) => {
  // Calculate risk level for styling
  const getRiskColor = (score: number) => {
    if (score <= 3) return "bg-green-500";
    if (score <= 6) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Get a gradient based on protocol category
  const getCategoryGradient = (category: string) => {
    switch (category.toLowerCase()) {
      case "lending":
        return "from-blue-600 to-cyan-600";
      case "dex":
        return "from-[rgb(210,113,254)] to-[rgb(210,113,254)]";
      case "yield":
        return "from-emerald-600 to-green-600";
      case "derivatives":
        return "from-pink-600 to-rose-600";
      default:
        return "from-amber-600 to-orange-600";
    }
  };

  return (
    <ResponsiveCard
      variant="glass"
      size="sm"
      withHover
      className="overflow-hidden border border-gray-800/50 hover:border-purple-500/30 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {protocol.logoUrl ? (
            <div className="rounded-full bg-gray-800/50 p-0.5 border border-gray-700/50 shadow-sm">
              <Image
                src={protocol.logoUrl}
                alt={protocol.name}
                width={32}
                height={32}
                className="rounded-full object-contain"
              />
            </div>
          ) : (
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br",
                getCategoryGradient(protocol.category)
              )}
            >
              <span className="text-xs font-medium">
                {protocol.name.substring(0, 2)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-medium text-sm sm:text-base">
              {protocol.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{protocol.category}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>{protocol.chainName}</span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite();
          }}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-full transition-all",
            isFavorite
              ? "bg-amber-900/30 text-amber-400"
              : "bg-gray-800/50 text-gray-400 hover:text-amber-400 hover:bg-gray-800/80"
          )}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className="w-4 h-4"
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">TVL</div>
          <div className="text-sm font-medium">
            $
            {protocol.tvl >= 1e9
              ? (protocol.tvl / 1e9).toFixed(2) + "B"
              : (protocol.tvl / 1e6).toFixed(1) + "M"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">APY</div>
          <div
            className={cn(
              "text-sm font-medium flex items-center",
              protocol.apy > 15 ? "text-green-400" : "text-green-500"
            )}
          >
            {protocol.apy.toFixed(1)}%
            {protocol.apy > 20 && <TrendingUp className="w-3 h-3 ml-1" />}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Risk Score</div>
          <div className="text-sm font-medium flex items-center">
            <span className="mr-1.5">{protocol.riskScore.toFixed(1)}</span>
            <div className="w-full max-w-[60px] bg-gray-800/50 h-1.5 rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  getRiskColor(protocol.riskScore)
                )}
                style={{ width: `${(protocol.riskScore / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Audited</div>
          <div
            className={cn(
              "text-sm font-medium flex items-center",
              protocol.audited ? "text-green-500" : "text-red-400"
            )}
          >
            <Shield
              className="w-3 h-3 mr-1"
              fill={protocol.audited ? "currentColor" : "none"}
            />
            {protocol.audited ? "Yes" : "No"}
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-2 mt-3 border-t border-gray-800/30 pt-3">
        <button className="flex-1 text-xs px-3 py-1.5 bg-[rgba(210,113,254,0.15)] hover:bg-[rgba(210,113,254,0.25)] rounded-lg transition-colors text-black flex items-center justify-center">
          View Details
        </button>
        <button className="flex items-center justify-center w-9 h-8 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors">
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </ResponsiveCard>
  );
};
