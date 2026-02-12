import { query } from "./_generated/server";

// Temporary function to check database state without auth
export const checkDatabase = query({
  args: {},
  handler: async (ctx) => {
    const movementsCount = await ctx.db
      .query("movements")
      .collect()
      .then((m) => m.length);
    const movementStatusesCount = await ctx.db
      .query("movementStatuses")
      .collect()
      .then((s) => s.length);
    const paymentsCount = await ctx.db
      .query("payments")
      .collect()
      .then((p) => p.length);
    const paymentStatusesCount = await ctx.db
      .query("paymentStatuses")
      .collect()
      .then((ps) => ps.length);

    return {
      movements: movementsCount,
      movementStatuses: movementStatusesCount,
      payments: paymentsCount,
      paymentStatuses: paymentStatusesCount,
    };
  },
});
