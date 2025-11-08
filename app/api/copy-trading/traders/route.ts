import { NextRequest, NextResponse } from 'next/server'
import { Trader } from '@/lib/types/copy-trading'

// Mock data - replace with real database queries
const mockTraders: Trader[] = [
	{
		id: '1',
		name: 'CryptoWhale',
		address: '0x1111...2222',
		trades: 450,
		roi: 185,
		pnl: '+$245,890.12',
		winRate: 89.5,
		scamRate: 0,
		usersWinRate: 85,
		totalFollowers: 3200,
		createdAt: '2024-01-10T00:00:00Z',
		isVerified: true
	},
	{
		id: '2',
		name: 'DeFiMaster',
		address: '0x2222...3333',
		trades: 320,
		roi: 142,
		pnl: '+$189,234.56',
		winRate: 82.3,
		scamRate: 0.5,
		usersWinRate: 78,
		totalFollowers: 2100,
		createdAt: '2024-01-15T00:00:00Z',
		isVerified: true
	},
	{
		id: '3',
		name: 'YieldHunter',
		address: '0x3333...4444',
		trades: 680,
		roi: 95,
		pnl: '+$156,789.23',
		winRate: 75.8,
		scamRate: 0,
		usersWinRate: 72,
		totalFollowers: 4500,
		createdAt: '2023-12-20T00:00:00Z',
		isVerified: true
	},
	{
		id: '4',
		name: 'SmartTrader',
		address: '0x4444...5555',
		trades: 210,
		roi: 168,
		pnl: '+$134,567.89',
		winRate: 88.2,
		scamRate: 0,
		usersWinRate: 81,
		totalFollowers: 1800,
		createdAt: '2024-02-01T00:00:00Z',
		isVerified: true
	},
	{
		id: '5',
		name: 'AlphaTrader',
		address: '0x5555...6666',
		trades: 890,
		roi: 78,
		pnl: '+$298,456.78',
		winRate: 68.5,
		scamRate: 1.2,
		usersWinRate: 65,
		totalFollowers: 5200,
		createdAt: '2023-11-15T00:00:00Z',
		isVerified: true
	},
	{
		id: '6',
		name: 'VaultKing',
		address: '0x6666...7777',
		trades: 1200,
		roi: 45,
		pnl: '+$567,890.12',
		winRate: 72.3,
		scamRate: 0,
		usersWinRate: 68,
		totalFollowers: 6800,
		createdAt: '2023-10-01T00:00:00Z',
		isVerified: true
	},
	{
		id: '7',
		name: 'RiskManager',
		address: '0x7777...8888',
		trades: 340,
		roi: 125,
		pnl: '+$123,456.78',
		winRate: 85.6,
		scamRate: 0,
		usersWinRate: 79,
		totalFollowers: 2400,
		createdAt: '2024-01-20T00:00:00Z',
		isVerified: true
	},
	{
		id: '8',
		name: 'TrendFollower',
		address: '0x8888...9999',
		trades: 560,
		roi: 92,
		pnl: '+$234,567.89',
		winRate: 74.2,
		scamRate: 0.8,
		usersWinRate: 70,
		totalFollowers: 3800,
		createdAt: '2023-12-10T00:00:00Z',
		isVerified: true
	},
	{
		id: '9',
		name: 'MorphoExpert',
		address: '0x9999...aaaa',
		trades: 780,
		roi: 65,
		pnl: '+$345,678.90',
		winRate: 71.5,
		scamRate: 0,
		usersWinRate: 66,
		totalFollowers: 4100,
		createdAt: '2023-11-25T00:00:00Z',
		isVerified: true
	},
	{
		id: '10',
		name: 'StableCoinPro',
		address: '0xaaaa...bbbb',
		trades: 420,
		roi: 38,
		pnl: '+$98,765.43',
		winRate: 80.1,
		scamRate: 0,
		usersWinRate: 75,
		totalFollowers: 1900,
		createdAt: '2024-02-05T00:00:00Z',
		isVerified: true
	}
]

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const timeframe = searchParams.get('timeframe') || '7D'
		const sortBy = searchParams.get('sortBy') || 'roi'
		const minWinRate = searchParams.get('minWinRate')
		const maxScamRate = searchParams.get('maxScamRate')

		let filteredTraders = [...mockTraders]

		// Apply filters
		if (minWinRate) {
			filteredTraders = filteredTraders.filter(
				trader => trader.winRate >= parseFloat(minWinRate)
			)
		}

		if (maxScamRate) {
			filteredTraders = filteredTraders.filter(
				trader => trader.scamRate <= parseFloat(maxScamRate)
			)
		}

		// Sort
		filteredTraders.sort((a, b) => {
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
			data: filteredTraders,
			count: filteredTraders.length
		})
	} catch (error) {
		console.error('Error fetching traders:', error)
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch traders' },
			{ status: 500 }
		)
	}
}

