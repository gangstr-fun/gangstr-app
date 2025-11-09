'use client'

import React from 'react'
import { TradingGroup } from '@/lib/types/copy-trading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
		<tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
			{/* Rank */}
			<td className="px-4 py-4 text-sm font-medium text-gray-600">
				{rank}
			</td>

			{/* Group */}
			<td className="px-4 py-4">
				<div className="flex items-center space-x-3">
					<Avatar className="h-10 w-10 border-2 border-gray-200">
						<AvatarImage src={group.avatar} alt={group.name} />
						<AvatarFallback className="bg-primary text-white text-xs font-semibold">
							{getInitials(group.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center space-x-2">
							<h3 className="text-sm font-semibold text-gray-900 truncate">
								{group.name}
							</h3>
							{group.isVerified && (
								<CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
							)}
							<span className="text-xs text-gray-500 flex-shrink-0">
								{group.groupId}
							</span>
						</div>
						<p className="text-xs text-gray-500 truncate">
							by {group.owner}
						</p>
					</div>
				</div>
			</td>

			{/* Trades */}
			<td className="px-4 py-4 text-sm text-gray-700">
				{group.trades.toLocaleString()}
			</td>

			{/* ROI */}
			<td
				className={cn(
					'px-4 py-4 text-sm font-medium',
					isPositiveROI ? 'text-green-600' : 'text-red-600'
				)}
			>
				{isPositiveROI ? '+' : ''}
				{group.roi.toFixed(1)}%
			</td>

			{/* PnL */}
			<td
				className={cn(
					'px-4 py-4 text-sm font-medium',
					isPositivePnL ? 'text-green-600' : 'text-red-600'
				)}
			>
				{group.pnl}
			</td>

			{/* Win Rate */}
			<td className="px-4 py-4 text-sm text-gray-700">
				{group.winRate.toFixed(2)}%
			</td>

			{/* Scam Rate */}
			<td className="px-4 py-4 text-sm text-gray-700">
				{group.scamRate.toFixed(1)}%
			</td>

			{/* Users Win Rate */}
			<td className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<span className="text-sm text-gray-700">{group.usersWinRate}%</span>
				</div>
			</td>

			{/* Copy Action */}
			<td className="px-4 py-4">
				<div className="flex items-center space-x-2">
					<Button
						size="sm"
						variant="default"
						onClick={() => onCopy(group.id)}
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

