'use client';

import React from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { MoreVertical } from 'lucide-react';
import {AutomationCardProps } from "@/lib/types"

export function AutomationCard({ automation }: AutomationCardProps) {
  const statusColors = {
    active: 'bg-green-500',
    paused: 'bg-yellow-500',
    archived: 'bg-gray-500',
  };

  const pnlColor = automation.pnl >= 0 ? 'text-success' : 'text-danger';

  return (
    <GlassPanel className="p-4 flex flex-col justify-between h-full relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 text-gray-400 hover:text-white">
          <MoreVertical size={18} />
        </button>
      </div>
      <div>
        <h3 className="text-lg font-normal pr-8">{automation.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full ${statusColors[automation.status]}`}></span>
          <p className="text-sm capitalize text-gray-400">{automation.status}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-white/60">PnL</div>
          <div className={`font-medium ${pnlColor}`}>
            ${automation.pnl.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/60">APY (est.)</div>
          <div className="font-medium">{automation.apy.toFixed(1)}%</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
        <p className="text-xs text-gray-500">Created: {new Date(automation.createdAt).toLocaleDateString()}</p>
        <div>
          <button className="text-xs px-3 py-1 bg-primary-500/20 rounded hover:bg-primary-500/30 transition-colors mr-2">
            Manage
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
