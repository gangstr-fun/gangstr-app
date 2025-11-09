import { NextRequest, NextResponse } from 'next/server'
import { TradingGroup } from '@/lib/types/copy-trading'

// Mock data - replace with real database queries
const mockGroups: TradingGroup[] = [
	{
		id: '1',
		name: 'TopTraders',
		groupId: 22,
		owner: 'ManganeseSubmarine',
		ownerAddress: '0x1234...5678',
		trades: 23,
		roi: 170,
		pnl: '+$12,610.46',
		winRate: 92.86,
		scamRate: 4.3,
		usersWinRate: 88,
		totalUsers: 1250,
		createdAt: '2024-01-15T00:00:00Z',
		isVerified: true
	},
	{
		id: '2',
		name: 'interface',
		groupId: 3,
		owner: 'theborklar',
		ownerAddress: '0x2345...6789',
		trades: 31,
		roi: 250,
		pnl: '+$19,315.25',
		winRate: 83.97,
		scamRate: 0,
		usersWinRate: 83,
		totalUsers: 980,
		createdAt: '2024-02-01T00:00:00Z',
		isVerified: true
	},
	{
		id: '3',
		name: 'matsuko group',
		groupId: 7,
		owner: 'matsukooni77',
		ownerAddress: '0x3456...7890',
		trades: 157,
		roi: -28,
		pnl: '$-144,679.29',
		winRate: 29.5,
		scamRate: 0,
		usersWinRate: 67,
		totalUsers: 2100,
		createdAt: '2024-01-20T00:00:00Z',
		isVerified: false
	},
	{
		id: '4',
		name: 'Top Dogs by Hotch',
		groupId: 10,
		owner: 'Hotch',
		ownerAddress: '0x4567...8901',
		trades: 224,
		roi: 33,
		pnl: '+$95,596.86',
		winRate: 76.74,
		scamRate: 1.3,
		usersWinRate: 58,
		totalUsers: 1750,
		createdAt: '2024-01-10T00:00:00Z',
		isVerified: true
	},
	{
		id: '5',
		name: 'Elite Traders',
		groupId: 15,
		owner: 'CryptoMaster',
		ownerAddress: '0x5678...9012',
		trades: 408,
		roi: 54,
		pnl: '+$32,533.85',
		winRate: 81.62,
		scamRate: 0.25,
		usersWinRate: 46,
		totalUsers: 3200,
		createdAt: '2023-12-15T00:00:00Z',
		isVerified: true
	},
	{
		id: '6',
		name: 'Morpho Vault Masters',
		groupId: 42,
		owner: 'VaultKing',
		ownerAddress: '0x6789...0123',
		trades: 79113,
		roi: 9.8,
		pnl: '+$915,243.39',
		winRate: 54.06,
		scamRate: 0,
		usersWinRate: 44,
		totalUsers: 8500,
		createdAt: '2023-11-01T00:00:00Z',
		isVerified: true
	},
	{
		id: '7',
		name: 'Yield Optimizers',
		groupId: 8,
		owner: 'YieldGuru',
		ownerAddress: '0x7890...1234',
		trades: 1920,
		roi: 4.8,
		pnl: '+$36,771.85',
		winRate: 55.66,
		scamRate: 0,
		usersWinRate: 42,
		totalUsers: 2100,
		createdAt: '2024-02-10T00:00:00Z',
		isVerified: true
	},
	{
		id: '8',
		name: 'DeFi Strategists',
		groupId: 19,
		owner: 'DeFiWizard',
		ownerAddress: '0x8901...2345',
		trades: 1615,
		roi: 31,
		pnl: '+$443,482.35',
		winRate: 48.54,
		scamRate: 0.99,
		usersWinRate: 40,
		totalUsers: 1850,
		createdAt: '2024-01-25T00:00:00Z',
		isVerified: true
	},
	{
		id: '9',
		name: 'Smart Money',
		groupId: 33,
		owner: 'WhaleWatcher',
		ownerAddress: '0x9012...3456',
		trades: 5236,
		roi: 18,
		pnl: '+$394,603.58',
		winRate: 63.26,
		scamRate: 0.11,
		usersWinRate: 38,
		totalUsers: 4200,
		createdAt: '2023-12-20T00:00:00Z',
		isVerified: true
	},
	{
		id: '10',
		name: 'Alpha Hunters',
		groupId: 5,
		owner: 'AlphaSeeker',
		ownerAddress: '0x0123...4567',
		trades: 1942,
		roi: 24,
		pnl: '+$527,628.52',
		winRate: 64.64,
		scamRate: 0.1,
		usersWinRate: 38,
		totalUsers: 2900,
		createdAt: '2024-01-05T00:00:00Z',
		isVerified: true
	},
	{
		id: '11',
		name: 'Risk Managers',
		groupId: 12,
		owner: 'RiskMaster',
		ownerAddress: '0x1234...5678',
		trades: 2215,
		roi: -13,
		pnl: '$-4,496,774.8',
		winRate: 72.91,
		scamRate: 0.09,
		usersWinRate: 35,
		totalUsers: 1500,
		createdAt: '2024-02-15T00:00:00Z',
		isVerified: false
	}
]

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const timeframe = searchParams.get('timeframe') || '7D'
		const sortBy = searchParams.get('sortBy') || 'roi'
		const minWinRate = searchParams.get('minWinRate')
		const maxScamRate = searchParams.get('maxScamRate')

		let filteredGroups = [...mockGroups]

		// Apply filters
		if (minWinRate) {
			filteredGroups = filteredGroups.filter(
				group => group.winRate >= parseFloat(minWinRate)
			)
		}

		if (maxScamRate) {
			filteredGroups = filteredGroups.filter(
				group => group.scamRate <= parseFloat(maxScamRate)
			)
		}

		// Sort
		filteredGroups.sort((a, b) => {
			switch (sortBy) {
				case 'roi':
					return b.roi - a.roi
				case 'pnl':
					const aPnl = parseFloat(a.pnl.replace(/[^0-9.-]/g, ''))
					const bPnl = parseFloat(b.pnl.replace(/[^0-9.-]/g, ''))
					return bPnl - aPnl
				case 'winRate':
					return b.winRate - a.winRate
				case 'usersWinRate':
					return b.usersWinRate - a.usersWinRate
				case 'trades':
					return b.trades - a.trades
				default:
					return b.roi - a.roi
			}
		})

		return NextResponse.json({
			success: true,
			data: filteredGroups,
			count: filteredGroups.length
		})
	} catch (error) {
		console.error('Error fetching trading groups:', error)
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch trading groups' },
			{ status: 500 }
		)
	}
}

