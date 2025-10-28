import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getTxExplorerUrl } from "@/lib/utils/explorer";

export function TransactionItem({ transaction }: { transaction: any }) {
  const [expanded, setExpanded] = useState(false);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return "⬇️";
      case "WITHDRAWAL":
        return "⬆️";
      case "SWAP":
        return "🔄";
      case "STAKE":
        return "🔒";
      case "UNSTAKE":
        return "🔓";
      case "YIELD":
        return "💰";
      default:
        return "📝";
    }
  };

  // Get transaction color based on type
  const getTransactionColor = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return "bg-green-900/20 text-green-400";
      case "WITHDRAWAL":
        return "bg-red-900/20 text-red-400";
      case "SWAP":
        return "bg-primary/20 text-primary";
      case "STAKE":
        return "bg-[rgba(210,113,254,0.15)] text-[rgb(210,113,254)]";
      case "UNSTAKE":
        return "bg-yellow-900/20 text-yellow-400";
      case "YIELD":
        return "bg-green-900/20 text-green-400";
      default:
        return "bg-white/10 text-white/80";
    }
  };

  // Format transaction description
  const getTransactionDescription = (tx: any) => {
    switch (tx.type) {
      case "DEPOSIT":
        return `Deposited ${tx.amount} ${tx.assetSymbol}`;
      case "WITHDRAWAL":
        return `Withdrew ${tx.amount} ${tx.assetSymbol}`;
      case "SWAP":
        return `Swapped ${tx.amount} ${tx.assetSymbol} for ${tx.targetAmount} ${tx.targetAssetSymbol}`;
      case "STAKE":
        return `Staked ${tx.amount} ${tx.assetSymbol}`;
      case "UNSTAKE":
        return `Unstaked ${tx.amount} ${tx.assetSymbol}`;
      case "YIELD":
        return `Harvested yield of ${tx.amount} ${tx.assetSymbol}`;
      default:
        return `${tx.type} transaction`;
    }
  };

  return (
    <GlassPanel
      className="p-4"
      bordered
      interactive
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div
            className={`p-2 rounded mr-3 ${getTransactionColor(
              transaction.type
            )}`}
          >
            {getTransactionIcon(transaction.type)}
          </div>

          <div>
            <div className="font-medium">
              {getTransactionDescription(transaction)}
            </div>
            <div className="text-xs text-white/60">
              {formatDate(transaction.timestamp)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-medium">
            $
            {transaction.totalValue?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-white/60">{transaction.status}</div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 bg-white/5 p-3 rounded text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/60 mb-1"> Transaction Details </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Type </span>
                  <span> {transaction.type} </span>
                </div>
                <div className="flex justify-between">
                  <span>Asset </span>
                  <span> {transaction.assetSymbol} </span>
                </div>
                {transaction.targetAssetSymbol && (
                  <div className="flex justify-between">
                    <span>Target Asset </span>
                    <span> {transaction.targetAssetSymbol} </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Amount </span>
                  <span> {transaction.amount} </span>
                </div>
                {transaction.targetAmount && (
                  <div className="flex justify-between">
                    <span>Target Amount </span>
                    <span> {transaction.targetAmount} </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Price </span>
                  <span> ${transaction.price} </span>
                </div>
                {transaction.apy && (
                  <div className="flex justify-between">
                    <span>APY </span>
                    <span> {transaction.apy.toFixed(2)} % </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-white/60 mb-1"> Blockchain Info </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Chain </span>
                  <span>
                    {transaction.chainId === 1
                      ? "Ethereum"
                      : transaction.chainId === 10
                      ? "Optimism"
                      : transaction.chainId === 137
                      ? "Polygon"
                      : transaction.chainId === 42161
                      ? "Arbitrum"
                      : `Chain ${transaction.chainId}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fee </span>
                  <span> ${transaction.fee.toFixed(4)} </span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp </span>
                  <span> {formatDate(transaction.timestamp)} </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tx Hash </span>
                  <span
                    className="truncate max-w-[150px]"
                    title={transaction.txHash}
                  >
                    {transaction.txHash}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <a
              href={getTxExplorerUrl(transaction.txHash, transaction.chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1 bg-primary-500/30 rounded hover:bg-primary-500/50 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              View on Explorer
            </a>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
