export const RISK_QUESTIONNAIRE = {
  questions: [
    {
      id: 1,
      question:
        "If your portfolio suddenly dropped 20% in one week, what would you do?",
      options: [
        { value: "A", text: "Panic-sell everything", points: 1 },
        { value: "B", text: "Hold and wait", points: 3 },
        { value: "C", text: "Buy more at the dip", points: 5 },
      ],
    },
    {
      id: 2,
      question:
        "What % of your total investable assets are you comfortable exposing to DeFi lending?",
      options: [
        { value: "A", text: "10% or less", points: 1 },
        { value: "B", text: "10–30%", points: 3 },
        { value: "C", text: "30% or more", points: 5 },
      ],
    },
    {
      id: 3,
      question: "Over a 12-month horizon, your primary goal is…",
      options: [
        { value: "A", text: "Preserve capital", points: 1 },
        { value: "B", text: "Moderate growth", points: 3 },
        { value: "C", text: "High growth (accept volatility)", points: 5 },
      ],
    },
    {
      id: 4,
      question:
        "When a new DeFi protocol offers 15% APY but has only 6 months of live history, you…",
      options: [
        { value: "A", text: "Avoid it", points: 1 },
        { value: "B", text: "Test small allocation (e.g. 5%)", points: 3 },
        { value: "C", text: "Jump in (up to your full budget)", points: 5 },
      ],
    },
    {
      id: 5,
      question:
        "If one of your positions is liquidated with a 10% penalty, you'd feel…",
      options: [
        { value: "A", text: "Devastated", points: 1 },
        { value: "B", text: "A bit annoyed", points: 3 },
        { value: "C", text: '"That\'s the game" – move on', points: 5 },
      ],
    },
  ],
  riskCategories: [
    {
      min: 0,
      max: 3,
      category: "Ultra-Conservative",
      aggressiveness: 0.7,
      description: "Prefer stability; scale down allocations by 30%",
    },
    {
      min: 3,
      max: 6,
      category: "Moderate",
      aggressiveness: 1.0,
      description: "Neutral stance; use full budget",
    },
    {
      min: 6,
      max: 10,
      category: "Aggressive",
      aggressiveness: 1.3,
      description: "Chase yields; boost allocations by 30%",
    },
  ],
} as const;
