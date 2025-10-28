
export interface HeaderProps {
    toggleSidebar: () => void;
    mode?: 'basic' | 'pro';
}

export interface Automation {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'archived';
    pnl: number;
    apy: number;
    createdAt: string;
}

export interface AutomationCardProps {
    automation: Automation;
}
