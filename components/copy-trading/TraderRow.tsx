'use client'

import React from 'react'
import { Trader } from '@/lib/types/copy-trading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TableRow, TableCell } from '@/components/ui/table'
import { MoreVertical, Copy, CheckCircle2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TraderRowProps {
	trader: Trader
	rank: number
	onCopy: (traderId: string) => void
	copyAmount?: number
}

export const TraderRow: React.FC<TraderRowProps> = ({
	trader,
	rank,
	onCopy,
	copyAmount = 25
}) => {
	const isPositiveROI = trader.roi > 0
	const isPositivePnL = trader.pnl.startsWith('+')

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

			{/* Trader */}
			<TableCell className="px-4 py-4">
				<div className="flex items-center space-x-3">
					<Avatar className="h-10 w-10 border-2 border-[var(--color-border)]">
						<AvatarImage src={trader.avatar} alt={trader.name} />
						<AvatarFallback className="bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] text-xs font-semibold font-mono">
							{getInitials(trader.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center space-x-2">
							<h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
								{trader.name}
							</h3>
							{trader.isVerified && (
								<CheckCircle2 className="h-4 w-4 text-[var(--color-accent-primary)] flex-shrink-0" />
							)}
						</div>
						<p className="text-xs text-[var(--color-text-tertiary)] truncate font-mono">
							{trader.address}
						</p>
					</div>
				</div>
			</TableCell>

			{/* Trades */}
			<TableCell className="px-4 py-4 text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
				{trader.trades.toLocaleString()}
			</TableCell>

			{/* ROI */}
			<TableCell
				className={cn(
					'px-4 py-4 text-sm font-semibold font-mono font-variant-numeric-tabular',
					isPositiveROI ? 'text-[var(--color-alert-green)]' : 'text-[var(--color-alert-red)]'
				)}
			>
				{isPositiveROI ? '+' : ''}
				{trader.roi.toFixed(1)}%
			</TableCell>

			{/* PnL */}
			<TableCell
				className={cn(
					'px-4 py-4 text-sm font-semibold font-mono font-variant-numeric-tabular',
					isPositivePnL ? 'text-[var(--color-alert-green)]' : 'text-[var(--color-alert-red)]'
				)}
			>
				{trader.pnl}
			</TableCell>

			{/* Win Rate */}
			<TableCell className="px-4 py-4 text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
				{trader.winRate.toFixed(2)}%
			</TableCell>

			{/* Scam Rate */}
			<TableCell className="px-4 py-4 text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
				{trader.scamRate.toFixed(1)}%
			</TableCell>

			{/* Users Win Rate */}
			<TableCell className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<Users className="h-4 w-4 text-[var(--color-text-tertiary)]" />
					<span className="text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">{trader.usersWinRate}%</span>
				</div>
			</TableCell>

			{/* Followers */}
			<TableCell className="px-4 py-4 text-sm text-[var(--color-text-primary)] font-mono font-variant-numeric-tabular">
				{trader.totalFollowers.toLocaleString()}
			</TableCell>

			{/* Copy Action */}
			<TableCell className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<Button
						size="sm"
						variant="default"
						onClick={() => onCopy(trader.id)}
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

