import React, { useState } from "react";
import {DefiAllocationWizardProps, RiskQuestion} from "@/lib/types/allocation"

const DefiAllocationWizard: React.FC<DefiAllocationWizardProps> = ({
  userWalletAddress,
  chainId = "base-sepolia",
}) => {
  const [step, setStep] = useState<"INITIAL" | "AWAITING_BUDGET" | "COMPLETE">(
    "INITIAL"
  );
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  );
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [budget, setBudget] = useState("");
  const [allocation, setAllocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Risk questionnaire questions
  const questions: RiskQuestion[] = [
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
  ];

  const handleRiskAssessment = async (userResponses: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/defi/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userResponses,
          sessionId,
          userWalletAddress,
          chainId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setRiskProfile(result.riskProfile);
        setStep("AWAITING_BUDGET");
      } else {
        setError(result.error || "Failed to complete risk assessment");
      }
    } catch (error) {
      setError(
        `Network error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetSubmission = async () => {
    if (!budget || parseFloat(budget) <= 0) {
      setError("Please enter a valid budget amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/defi/generate-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: parseFloat(budget),
          sessionId,
          userWalletAddress,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAllocation(result);
        setStep("COMPLETE");
      } else {
        setError(result.error || "Failed to generate allocation");
      }
    } catch (error) {
      setError(
        `Network error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    const newResponses = [...responses, answer];
    setResponses(newResponses);

    if (newResponses.length === questions.length) {
      // All questions answered, submit risk assessment
      handleRiskAssessment(newResponses);
    } else {
      // Move to next question
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === "AWAITING_BUDGET") {
      handleBudgetSubmission();
    }
  };

  if (step === "INITIAL") {
    return (
      <div className="defi-wizard max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">
          DeFi Risk Assessment
        </h2>

        {currentQuestion < questions.length ? (
          <div className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm text-primary mb-2">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              <h3 className="text-lg font-semibold text-gray-800">
                {questions[currentQuestion].question}
              </h3>
            </div>

            <div className="space-y-3">
              {questions[currentQuestion].options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  disabled={loading}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors disabled:opacity-50"
                >
                  <span className="font-semibold text-primary">
                    {option.value}.
                  </span>{" "}
                  {option.text}
                </button>
              ))}
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">
                  Processing your responses...
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">
              Calculating your risk profile...
            </p>
          </div>
        )}
      </div>
    );
  }

  if (step === "AWAITING_BUDGET") {
    return (
      <div className="defi-wizard max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Risk Profile Complete!
        </h2>

        {riskProfile && (
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-green-800 mb-2">
              Your Risk Assessment
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Risk Score:</span>{" "}
                {riskProfile.riskAssessment.riskScore}/10
              </div>
              <div>
                <span className="font-medium">Category:</span>{" "}
                {riskProfile.riskAssessment.category}
              </div>
              <div>
                <span className="font-medium">Strategy:</span>{" "}
                {riskProfile.riskAssessment.description}
              </div>
              <div>
                <span className="font-medium">Max DeFi Exposure:</span>{" "}
                {riskProfile.recommendations.maxDeFiExposure}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-gray-700 font-medium">
              Enter your investment budget:
            </span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 10000"
              min="0"
              step="100"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>

          <button
            onClick={handleBudgetSubmission}
            disabled={loading || !budget}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Generating Strategy..."
              : "Generate Allocation Strategy"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (step === "COMPLETE" && allocation) {
    return (
      <div className="defi-wizard max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Allocation Strategy Generated!
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-primary/5 p-4 rounded-lg">
            <h3 className="font-semibold text-primary mb-2">
              Risk Assessment Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Risk Score:</span>{" "}
                {allocation.riskProfile.riskAssessment.riskScore}/10
              </div>
              <div>
                <span className="font-medium">Category:</span>{" "}
                {allocation.riskProfile.riskAssessment.category}
              </div>
              <div>
                <span className="font-medium">Strategy:</span>{" "}
                {allocation.riskProfile.riskAssessment.description}
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">
              Allocation Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Budget:</span> $
                {allocation.budget.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Total Allocated:</span> $
                {allocation.totalAllocated.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Utilization:</span>{" "}
                {(allocation.utilization * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            DeFi Allocation Strategy
          </h3>
          <div className="space-y-3">
            {allocation.allocations.map((allocation: any, index: number) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <div className="font-medium">{allocation.name}</div>
                  {allocation.protocol && (
                    <div className="text-sm text-gray-600">
                      Protocol: {allocation.protocol}
                      {allocation.vaultName &&
                        ` | Vault: ${allocation.vaultName}`}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ${allocation.allocation.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {allocation.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setStep("INITIAL");
              setRiskProfile(null);
              setBudget("");
              setAllocation(null);
              setCurrentQuestion(0);
              setResponses([]);
            }}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default DefiAllocationWizard;
