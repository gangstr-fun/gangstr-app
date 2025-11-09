'use client'

import React from 'react'
import { Trader } from '@/lib/types/copy-trading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
		<tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
			{/* Rank */}
			<td className="px-4 py-4 text-sm font-medium text-gray-600">
				{rank}
			</td>

			{/* Trader */}
			<td className="px-4 py-4">
				<div className="flex items-center space-x-3">
					<Avatar className="h-10 w-10 border-2 border-gray-200">
						<AvatarImage src={trader.avatar} alt={trader.name} />
						<AvatarFallback className="bg-primary text-white text-xs font-semibold">
							{getInitials(trader.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center space-x-2">
							<h3 className="text-sm font-semibold text-gray-900 truncate">
								{trader.name}
							</h3>
							{trader.isVerified && (
								<CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
							)}
						</div>
						<p className="text-xs text-gray-500 truncate font-mono">
							{trader.address}
						</p>
					</div>
				</div>
			</td>

			{/* Trades */}
			<td className="px-4 py-4 text-sm text-gray-700">
				{trader.trades.toLocaleString()}
			</td>

			{/* ROI */}
			<td
				className={cn(
					'px-4 py-4 text-sm font-medium',
					isPositiveROI ? 'text-green-600' : 'text-red-600'
				)}
			>
				{isPositiveROI ? '+' : ''}
				{trader.roi.toFixed(1)}%
			</td>

			{/* PnL */}
			<td
				className={cn(
					'px-4 py-4 text-sm font-medium',
					isPositivePnL ? 'text-green-600' : 'text-red-600'
				)}
			>
				{trader.pnl}
			</td>

			{/* Win Rate */}
			<td className="px-4 py-4 text-sm text-gray-700">
				{trader.winRate.toFixed(2)}%
			</td>

			{/* Scam Rate */}
			<td className="px-4 py-4 text-sm text-gray-700">
				{trader.scamRate.toFixed(1)}%
			</td>

			{/* Users Win Rate */}
			<td className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<Users className="h-4 w-4 text-gray-400" />
					<span className="text-sm text-gray-700">{trader.usersWinRate}%</span>
				</div>
			</td>

			{/* Followers */}
			<td className="px-4 py-4 text-sm text-gray-700">
				{trader.totalFollowers.toLocaleString()}
			</td>

			{/* Copy Action */}
			<td className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<Button
						size="sm"
						variant="default"
						onClick={() => onCopy(trader.id)}
					>
						<Copy className="mr-1" />
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
			</td>
		</tr>
	)
}

