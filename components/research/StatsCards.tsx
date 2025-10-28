import { ResponsiveCard } from "@/components/molecule/responsive-card";
import {
  BookOpen,
  LineChart,
  Star,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface StatsCardsProps {
  totalProtocols: number;
  favoriteProtocolsCount: number;
  averageApy: number;
  averageRiskScore: number;
}

export function StatsCards({
  totalProtocols,
  favoriteProtocolsCount,
  averageApy,
  averageRiskScore,
}: StatsCardsProps) {
  const isMobile = useIsMobile();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <StatsCardItem
        title="Total Protocols"
        value={totalProtocols}
        icon={<BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
        change={5}
        gradient="from-[rgb(210,113,254)] to-[rgb(210,113,254)]"
      />
      <StatsCardItem
        title="Favorites"
        value={favoriteProtocolsCount}
        icon={<Star className="w-4 h-4 sm:w-5 sm:h-5" />}
        change={-2}
        gradient="from-amber-600 to-yellow-600"
      />
      <StatsCardItem
        title="Average APY"
        value={`${averageApy.toFixed(2)}%`}
        icon={<LineChart className="w-4 h-4 sm:w-5 sm:h-5" />}
        change={1.2}
        gradient="from-green-600 to-emerald-600"
      />
      <StatsCardItem
        title="Avg. Risk Score"
        value={averageRiskScore.toFixed(2)}
        icon={<ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
        change={-0.5}
        gradient="from-blue-600 to-cyan-600"
      />
    </div>
  );
}

interface StatsCardItemProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  gradient: string;
}

function StatsCardItem({
  title,
  value,
  icon,
  change,
  gradient,
}: StatsCardItemProps) {
  const isMobile = useIsMobile();
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <ResponsiveCard
      variant="glass"
      size="sm"
      withHover
      className="relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-x-5 -translate-y-5"></div>

      {/* Gradient accent line */}
      <div
        className={cn(
          "h-1 w-full absolute top-0 left-0 bg-gradient-to-r",
          gradient
        )}
      />

      <div className="pt-3 px-4">
        <div className="flex items-center mb-1.5">
          <div
            className={cn(
              "p-1.5 rounded-md bg-gradient-to-br opacity-80",
              gradient
            )}
          >
            {icon}
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-400 ml-2">
            {title}
          </h3>
        </div>

        <div className="flex items-end justify-between">
          <div className="text-base sm:text-xl font-normal">{value}</div>

          {change !== undefined && (
            <div
              className={cn(
                "flex items-center text-xs pb-0.5",
                isPositive
                  ? "text-green-400"
                  : isNegative
                  ? "text-red-400"
                  : "text-gray-400"
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3 mr-1" />}
              {isNegative && <TrendingDown className="w-3 h-3 mr-1" />}
              {isPositive ? "+" : ""}
              {change}%
            </div>
          )}
        </div>
      </div>
    </ResponsiveCard>
  );
}
