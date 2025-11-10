'use client'

import React from 'react'
import { TradingGroup } from '@/lib/types/copy-trading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TableRow, TableCell } from '@/components/ui/table'
import { MoreVertical, Copy, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TradingGroupRowProps {
	group: TradingGroup
	rank: number
	onCopy: (groupId: string) => void
	copyAmount?: number
}

export const TradingGroupRow: React.FC<TradingGroupRowProps> = ({
	group,
	rank,
	onCopy,
	copyAmount = 25
}) => {
	const isPositiveROI = group.roi > 0
	const isPositivePnL = group.pnl.startsWith('+')

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map(word => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	return (
		<TableRow className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-highlight)] transition-colors">
			{/* Rank */}
			<TableCell className="px-4 py-4 text-sm font-semibold text-[var(--color-text-secondary)] font-mono font-variant-numeric-tabular">
				{rank}
			</TableCell>

			{/* Group */}
			<TableCell className="px-4 py-4">
				<div className="flex items-center space-x-3">
					<Avatar className="h-10 w-10 border-2 border-[var(--color-border)]">
						<AvatarImage src={group.avatar} alt={group.name} />
						<AvatarFallback className="bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] text-xs font-semibold font-mono">
							{getInitials(group.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center space-x-2">
							<h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
								{group.name}
							</h3>
							{group.isVerified && (
								<CheckCircle2 className="h-4 w-4 text-[var(--color-accent-primary)] flex-shrink-0" />
							)}
							<span className="text-xs text-[var(--color-text-tertiary)] flex-shrink-0 font-mono">
								{group.groupId}
							</span>
						</div>
						<p className="text-xs text-[var(--color-text-tertiary)] truncate">
							by {group.owner}
						</p>
					</div>
				</div>
			</TableCell>

			{/* Trades */}
			<TableCell className="px-4 py-4 text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
				{group.trades.toLocaleString()}
			</TableCell>

			{/* ROI */}
			<TableCell
				className={cn(
					'px-4 py-4 text-sm font-semibold font-mono font-variant-numeric-tabular',
					isPositiveROI ? 'text-[var(--color-alert-green)]' : 'text-[var(--color-alert-red)]'
				)}
			>
				{isPositiveROI ? '+' : ''}
				{group.roi.toFixed(1)}%
			</TableCell>

			{/* PnL */}
			<TableCell
				className={cn(
					'px-4 py-4 text-sm font-semibold font-mono font-variant-numeric-tabular',
					isPositivePnL ? 'text-[var(--color-alert-green)]' : 'text-[var(--color-alert-red)]'
				)}
			>
				{group.pnl}
			</TableCell>

			{/* Win Rate */}
			<TableCell className="px-4 py-4 text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
				{group.winRate.toFixed(2)}%
			</TableCell>

			{/* Scam Rate */}
			<TableCell className="px-4 py-4 text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
				{group.scamRate.toFixed(1)}%
			</TableCell>

			{/* Users Win Rate */}
			<TableCell className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<span className="text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">{group.usersWinRate}%</span>
				</div>
			</TableCell>

			{/* Copy Action */}
			<TableCell className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<Button
						size="sm"
						variant="default"
						onClick={() => onCopy(group.id)}
						className="uppercase tracking-wider"
					>
						<Copy className="mr-1 h-3 w-3" />
						Copy ${copyAmount}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	)
}

