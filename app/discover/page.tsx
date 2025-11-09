'use client'

import React, { useState, useEffect } from 'react'
import { TradingGroup, Trader } from '@/lib/types/copy-trading'
import { TradingGroupRow } from '@/components/copy-trading/TradingGroupRow'
import { TraderRow } from '@/components/copy-trading/TraderRow'
import { CopyTradingStrategyDialog, CopyTradingStrategy } from '@/components/copy-trading/CopyTradingStrategyDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { Sparkles, ArrowRight, Clock, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useUnifiedWallet } from '@/lib/hooks/useUnifiedWallet'

export default function DiscoverPage() {
	const [activeTab, setActiveTab] = useState<'groups' | 'traders'>('groups')
	const [groups, setGroups] = useState<TradingGroup[]>([])
	const [traders, setTraders] = useState<Trader[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [copyAmount, setCopyAmount] = useState(25)
	const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | 'ALL'>('7D')
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [selectedGroup, setSelectedGroup] = useState<TradingGroup | null>(null)
	const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null)
	const { userWalletAddress } = useUnifiedWallet()

	useEffect(() => {
		fetchGroups()
		fetchTraders()
	}, [timeframe])

	const fetchGroups = async () => {
		try {
			setIsLoading(true)
			const response = await fetch(`/api/copy-trading/groups?timeframe=${timeframe}`)
			const data = await response.json()
			if (data.success) {
				setGroups(data.data)
			}
		} catch (error) {
			console.error('Error fetching groups:', error)
			toast.error('Failed to load trading groups')
		} finally {
			setIsLoading(false)
		}
	}

	const fetchTraders = async () => {
		try {
			const response = await fetch(`/api/copy-trading/traders?timeframe=${timeframe}`)
			const data = await response.json()
			if (data.success) {
				setTraders(data.data)
			}
		} catch (error) {
			console.error('Error fetching traders:', error)
			toast.error('Failed to load traders')
		}
	}

	const handleCopyGroup = (groupId: string) => {
		console.log('Copy button clicked for group:', groupId)
		const group = groups.find(g => g.id === groupId)
		if (!group) {
			console.error('Group not found:', groupId)
			toast.error('Group not found')
			return
		}

		console.log('Opening dialog for group:', group.name)
		if (!userWalletAddress) {
			toast.warning('Wallet not connected. You can still configure the strategy, but will need to connect to save.')
		}

		setSelectedGroup(group)
		setSelectedTrader(null)
		setIsDialogOpen(true)
	}

	const handleCopyTrader = (traderId: string) => {
		console.log('Copy button clicked for trader:', traderId)
		const trader = traders.find(t => t.id === traderId)
		if (!trader) {
			console.error('Trader not found:', traderId)
			toast.error('Trader not found')
			return
		}

		console.log('Opening dialog for trader:', trader.name)
		if (!userWalletAddress) {
			toast.warning('Wallet not connected. You can still configure the strategy, but will need to connect to save.')
		}

		setSelectedTrader(trader)
		setSelectedGroup(null)
		setIsDialogOpen(true)
	}

	const handleSaveStrategy = async (strategy: CopyTradingStrategy) => {
		if (!userWalletAddress) {
			toast.error('Please connect your wallet first to save the strategy')
			return
		}

		try {
			const targetId = selectedGroup?.id || selectedTrader?.id
			const targetType = selectedGroup ? 'group' : 'trader'
			const targetName = selectedGroup?.name || selectedTrader?.name

			// TODO: Implement actual copy trading API call
			// await fetch('/api/copy-trading/create', {
			//   method: 'POST',
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify({
			//     targetId,
			//     targetType,
			//     strategy,
			//   }),
			// })

			console.log('Saving copy strategy:', {
				targetId,
				targetType,
				targetName,
				strategy,
			})

			toast.success(
				`Copy strategy saved for ${targetName} with $${strategy.buyAmount}`
			)
		} catch (error) {
			console.error('Error saving copy strategy:', error)
			toast.error('Failed to save copy strategy')
		}
	}

	const handleCloseDialog = () => {
		setIsDialogOpen(false)
		setSelectedGroup(null)
		setSelectedTrader(null)
	}

	return (
		<>
			<CopyTradingStrategyDialog
				isOpen={isDialogOpen}
				onClose={handleCloseDialog}
				onSave={handleSaveStrategy}
				group={selectedGroup || undefined}
				trader={selectedTrader || undefined}
				defaultBuyAmount={copyAmount}
			/>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex flex-col space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Discover</h1>
						<p className="text-gray-600 mt-2">
							Jumpstart your trading with user-curated groups and top traders. Gangstr automates the trades — but outcomes depend on your strategy and market conditions.
						</p>
					</div>
				</div>

				{/* Tabs */}
				<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'groups' | 'traders')}>
					<div className="flex items-center justify-between">
						<TabsList className="bg-gray-100 p-1">
							<TabsTrigger
								value="groups"
								className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
							>
								Top Groups
							</TabsTrigger>
							<TabsTrigger
								value="traders"
								className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
							>
								Top Traders
							</TabsTrigger>
						</TabsList>

						{/* Action Buttons */}
						<div className="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								className="bg-white hover:bg-gray-50"
							>
								<Sparkles className="h-4 w-4 mr-2" />
								AI Suggest
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="bg-white hover:bg-gray-50"
							>
								Users Win Rate
								<ArrowRight className="h-4 w-4 ml-2" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									const timeframes: Array<'7D' | '30D' | '90D' | 'ALL'> = ['7D', '30D', '90D', 'ALL']
									const currentIndex = timeframes.indexOf(timeframe)
									const nextIndex = (currentIndex + 1) % timeframes.length
									setTimeframe(timeframes[nextIndex])
								}}
								className="bg-white hover:bg-gray-50"
							>
								<Clock className="h-4 w-4 mr-2" />
								{timeframe}
							</Button>
							<div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-md px-3 py-1.5">
								<Settings className="h-4 w-4 text-gray-400" />
								<span className="text-sm text-gray-600">Copy $</span>
								<input
									type="number"
									value={copyAmount}
									onChange={(e) => setCopyAmount(parseInt(e.target.value) || 25)}
									className="w-12 text-sm border-none outline-none text-gray-900"
									min="1"
								/>
							</div>
						</div>
					</div>

					{/* Top Groups Tab */}
					<TabsContent value="groups" className="mt-6">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-gray-50">
										<TableHead className="w-12">Rank</TableHead>
										<TableHead>Group</TableHead>
										<TableHead>Trades</TableHead>
										<TableHead>ROI</TableHead>
										<TableHead>PnL</TableHead>
										<TableHead>Win Rate</TableHead>
										<TableHead>Scam Rate</TableHead>
										<TableHead>Users Win Rate</TableHead>
										<TableHead className="w-40">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading ? (
										<TableRow>
											<TableCell colSpan={9} className="text-center py-8 text-gray-500">
												Loading trading groups...
											</TableCell>
										</TableRow>
									) : groups.length === 0 ? (
										<TableRow>
											<TableCell colSpan={9} className="text-center py-8 text-gray-500">
												No trading groups found
											</TableCell>
										</TableRow>
									) : (
										groups.map((group, index) => (
											<TradingGroupRow
												key={group.id}
												group={group}
												rank={index + 1}
												onCopy={handleCopyGroup}
												copyAmount={copyAmount}
											/>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</TabsContent>

					{/* Top Traders Tab */}
					<TabsContent value="traders" className="mt-6">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-gray-50">
										<TableHead className="w-12">Rank</TableHead>
										<TableHead>Trader</TableHead>
										<TableHead>Trades</TableHead>
										<TableHead>ROI</TableHead>
										<TableHead>PnL</TableHead>
										<TableHead>Win Rate</TableHead>
										<TableHead>Scam Rate</TableHead>
										<TableHead>Users Win Rate</TableHead>
										<TableHead>Followers</TableHead>
										<TableHead className="w-40">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading ? (
										<TableRow>
											<TableCell colSpan={10} className="text-center py-8 text-gray-500">
												Loading traders...
											</TableCell>
										</TableRow>
									) : traders.length === 0 ? (
										<TableRow>
											<TableCell colSpan={10} className="text-center py-8 text-gray-500">
												No traders found
											</TableCell>
										</TableRow>
									) : (
										traders.map((trader, index) => (
											<TraderRow
												key={trader.id}
												trader={trader}
												rank={index + 1}
												onCopy={handleCopyTrader}
												copyAmount={copyAmount}
											/>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</div>
		</>
	)
}

