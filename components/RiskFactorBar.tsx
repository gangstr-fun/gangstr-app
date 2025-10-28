import { RiskFactorBarProps } from "../lib/types/research";

export default function RiskFactorBar({ name, score, description }: RiskFactorBarProps) {
    // Determine the color based on the score (inverse scale for risk)
    const getRiskColor = (score: number) => {
        const inverseScore = 10 - score; // Convert to a "safety" score
        if (inverseScore >= 8) return "bg-green-500";
        if (inverseScore >= 6) return "bg-green-400";
        if (inverseScore >= 4) return "bg-yellow-400";
        if (inverseScore >= 2) return "bg-orange-400";
        return "bg-red-500";
    };

    const riskColor = getRiskColor(score);

    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="font-medium">{name}</span>
                <span className="text-sm">
                    Risk Level: <span className={getRiskColor(score).replace('bg-', 'text-')}>
                        {score <= 3 ? 'Very Low' :
                            score <= 5 ? 'Low' :
                                score <= 7 ? 'Moderate' :
                                    score <= 8.5 ? 'High' : 'Very High'}
                    </span>
                </span>
            </div>

            <div className="w-full bg-white/10 rounded-full h-2.5 mb-2">
                <div
                    className={`${riskColor} h-2.5 rounded-full`}
                    style={{ width: `${score * 10}%` }}
                />
            </div>

            <p className="text-xs text-white/60">{description}</p>
        </div>
    );
}
