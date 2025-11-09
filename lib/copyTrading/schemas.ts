import { z } from "zod";

export const SourcesSchema = z.object({
  type: z.enum(["USER", "GROUP"]),
  wallets: z.array(z.string().min(1)).optional(),
  groupId: z.string().min(1).optional(),
}).refine((v) => (v.type === "USER" ? !!v.wallets?.length : !!v.groupId), {
  message: "For USER provide wallets[], for GROUP provide groupId",
});

export const ConditionSchema = z.object({
  mode: z.enum(["ANY", "ALL"]),
  count: z.number().int().positive().optional(),
  timeWindowSec: z.number().int().positive(),
}).refine((v) => (v.mode === "ALL" ? typeof v.count === "number" && v.count > 0 : true), {
  message: "ALL mode requires a positive count",
});

export const BuySpecSchema = z.object({
  amountUSD: z.number().positive().optional(),
  amountToken: z.string().optional(), // human units string
  maxSlippagePct: z.number().min(0).max(100).default(0.5),
  minLiquidityUSD: z.number().min(0).optional(),
  tokenFilters: z
    .object({
      marketCapUSD: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
      tokenAgeDays: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
    })
    .optional(),
});

export const SellSpecSchema = z.object({
  followSeller: z.boolean().default(true),
  limitLadders: z
    .array(z.object({ pct: z.number(), portionPct: z.number().min(0).max(100) }))
    .optional(),
  stopLoss: z
    .object({ pct: z.number().min(0).max(100), dynamic: z.object({ trailPct: z.number().min(0).max(100) }).optional() })
    .optional(),
});

export const RiskGuardrailsSchema = z.object({
  spendDailyCapUSD: z.number().min(0).optional(),
  allowlist: z.array(z.string()).optional(),
  denylist: z.array(z.string()).optional(),
});

export const CopyTradeRuleCreateSchema = z.object({
  // userWalletAddress is taken from headers for auth, not body
  sources: SourcesSchema,
  condition: ConditionSchema,
  buySpec: BuySpecSchema,
  sellSpec: SellSpecSchema.optional(),
  riskGuardrails: RiskGuardrailsSchema.optional(),
  metadata: z.any().optional(),
});

export const CopyTradeRuleUpdateSchema = z.object({
  status: z.enum(["active", "paused", "deleted"]).optional(),
  sources: SourcesSchema.optional(),
  condition: ConditionSchema.optional(),
  buySpec: BuySpecSchema.optional(),
  sellSpec: SellSpecSchema.optional(),
  riskGuardrails: RiskGuardrailsSchema.optional(),
  metadata: z.any().optional(),
});

export type CopyTradeRuleCreate = z.infer<typeof CopyTradeRuleCreateSchema>;
export type CopyTradeRuleUpdate = z.infer<typeof CopyTradeRuleUpdateSchema>;
