'use client'

import React, { useState, useEffect } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { X, Plus } from 'lucide-react'
import { TradingGroup, Trader } from '@/lib/types/copy-trading'

export interface AutoSellRule {
	id: string
	type: 'sell_percentage' | 'gain_percentage' | 'drop_percentage'
	value: number
	label: string
}

export interface CopyTradingStrategy {
	buyAmount: number
	triggerCount: number
	minPurchaseAmount: number
	tokenFilters: string[]
	autoSellRules: AutoSellRule[]
	isDynamicStopLoss: boolean
}

interface CopyTradingStrategyDialogProps {
	isOpen: boolean
	onClose: () => void
	onSave: (strategy: CopyTradingStrategy) => void
	group?: TradingGroup
	trader?: Trader
	defaultBuyAmount?: number
}

export const CopyTradingStrategyDialog: React.FC<CopyTradingStrategyDialogProps> = ({
	isOpen,
	onClose,
	onSave,
	group,
	trader,
	defaultBuyAmount = 25,
}) => {
	useEffect(() => {
		if (isOpen) {
			console.log('Dialog opened with:', { group: group?.name, trader: trader?.name, defaultBuyAmount })
		}
	}, [isOpen, group, trader, defaultBuyAmount])

	const [buyAmount, setBuyAmount] = useState(defaultBuyAmount)
	const [triggerCount, setTriggerCount] = useState(1)
	const [minPurchaseAmount, setMinPurchaseAmount] = useState(500)
	const [tokenFilters, setTokenFilters] = useState<string[]>([])
	const [autoSellRules, setAutoSellRules] = useState<AutoSellRule[]>([
		{
			id: '1',
			type: 'sell_percentage',
			value: 50,
			label: 'When they sell',
		},
		{
			id: '2',
			type: 'gain_percentage',
			value: 50,
			label: 'Or the token gains',
		},
		{
			id: '3',
			type: 'drop_percentage',
			value: 18,
			label: 'Or the token drops by',
		},
	])
	const [isDynamicStopLoss, setIsDynamicStopLoss] = useState(true)

	const targetName = group?.name || trader?.name || 'group'

	useEffect(() => {
		if (isOpen) {
			setBuyAmount(defaultBuyAmount)
			setTriggerCount(1)
			setMinPurchaseAmount(500)
			setTokenFilters([])
			setAutoSellRules([
				{
					id: '1',
					type: 'sell_percentage',
					value: 50,
					label: 'When they sell',
				},
				{
					id: '2',
					type: 'gain_percentage',
					value: 50,
					label: 'Or the token gains',
				},
				{
					id: '3',
					type: 'drop_percentage',
					value: 18,
					label: 'Or the token drops by',
				},
			])
			setIsDynamicStopLoss(true)
		}
	}, [isOpen, defaultBuyAmount])

	const handleRemoveRule = (ruleId: string) => {
		setAutoSellRules(rules => rules.filter(rule => rule.id !== ruleId))
	}

	const handleUpdateRuleValue = (ruleId: string, value: number) => {
		setAutoSellRules(rules =>
			rules.map(rule => (rule.id === ruleId ? { ...rule, value } : rule))
		)
	}

	const handleAddTokenFilter = () => {
		// TODO: Implement token filter addition logic
		console.log('Add token filter')
	}

	const handleSave = () => {
		const strategy: CopyTradingStrategy = {
			buyAmount,
			triggerCount,
			minPurchaseAmount,
			tokenFilters,
			autoSellRules,
			isDynamicStopLoss,
		}
		onSave(strategy)
		onClose()
	}

	const handleDiscard = () => {
		onClose()
	}


	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-center text-xl font-semibold">
						Set your quick copy strategy
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* AUTO-BUY Section */}
					<div className="space-y-3">
						<h3 className="text-sm font-semibold text-gray-900">AUTO-BUY</h3>
						<div className="space-y-3 bg-gray-50 p-4 rounded-lg">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-sm text-gray-700">Buy me</span>
								<div className="flex items-center gap-1">
									<span className="text-sm text-gray-500">$</span>
									<Input
										type="number"
										value={buyAmount}
										onChange={e => setBuyAmount(parseFloat(e.target.value) || 0)}
										className="w-20 h-8 text-sm"
										min="0"
										step="0.01"
									/>
								</div>
								<span className="text-sm text-gray-700">worth of tokens whenever</span>
								<Input
									type="number"
									value={triggerCount}
									onChange={e => setTriggerCount(parseInt(e.target.value) || 1)}
									className="w-16 h-8 text-sm"
									min="1"
								/>
								<span className="text-sm text-gray-700">person in</span>
								<span className="text-sm font-medium text-primary">{targetName}</span>
								<span className="text-sm text-gray-700">buys a token with at</span>
								<div className="flex items-center gap-1">
									<span className="text-sm text-gray-500">least $</span>
									<Input
										type="number"
										value={minPurchaseAmount}
										onChange={e => setMinPurchaseAmount(parseFloat(e.target.value) || 0)}
										className="w-24 h-8 text-sm"
										min="0"
										step="0.01"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* TOKEN FILTERS Section */}
					<div className="space-y-3">
						<h3 className="text-sm font-semibold text-gray-900">TOKEN FILTERS</h3>
						<div className="bg-gray-50 p-4 rounded-lg">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleAddTokenFilter}
								className="w-full sm:w-auto"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add
							</Button>
							{tokenFilters.length > 0 && (
								<div className="mt-3 space-y-2">
									{tokenFilters.map((filter, index) => (
										<div key={index} className="text-sm text-gray-600">
											{filter}
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* AUTO-SELL Section */}
					<div className="space-y-3">
						<h3 className="text-sm font-semibold text-gray-900">AUTO-SELL</h3>
						<div className="space-y-3 bg-gray-50 p-4 rounded-lg">
							{autoSellRules.map((rule, index) => (
								<div key={rule.id} className="flex items-center gap-3 flex-wrap">
									{index > 0 && <span className="text-sm text-gray-500">Or</span>}
									<span className="text-sm text-gray-700 whitespace-nowrap">
										{rule.label}
									</span>
									{rule.type !== 'sell_percentage' && (
										<>
											<Input
												type="number"
												value={rule.value}
												onChange={e =>
													handleUpdateRuleValue(rule.id, parseFloat(e.target.value) || 0)
												}
												className="w-20 h-8 text-sm"
												min="0"
												step="0.01"
											/>
											<span className="text-sm text-gray-700">%</span>
										</>
									)}
									{rule.type === 'sell_percentage' && (
										<>
											<Input
												type="number"
												value={rule.value}
												onChange={e =>
													handleUpdateRuleValue(rule.id, parseFloat(e.target.value) || 0)
												}
												className="w-20 h-8 text-sm"
												min="0"
												step="0.01"
											/>
											<span className="text-sm text-gray-700">% of it</span>
										</>
									)}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => handleRemoveRule(rule.id)}
										className="h-6 w-6 ml-auto text-gray-400 hover:text-gray-600"
										aria-label="Remove rule"
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}

							{/* Dynamic Stop Loss Toggle */}
							<div className="mt-4 pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between">
									<div className="flex-1">
										<Label htmlFor="dynamic-stop-loss" className="text-sm font-medium text-gray-900">
											Make stop loss dynamic?
										</Label>
										<p className="text-xs text-gray-500 mt-1">
											Auto-adjusts with every 5% increase in price
										</p>
									</div>
									<Switch
										id="dynamic-stop-loss"
										checked={isDynamicStopLoss}
										onCheckedChange={setIsDynamicStopLoss}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={handleDiscard}
						className="w-full sm:w-auto"
					>
						Discard
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						className="w-full sm:w-auto bg-primary hover:bg-primary/90"
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

