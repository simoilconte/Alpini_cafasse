import { internalMutation } from "./_generated/server";

// This migration ensures movements and movementStatuses collections exist in production
export const ensureMovementsSchema = internalMutation({
  handler: async (ctx) => {
    // This migration will run once to create the new collections
    // The schema is already defined, we just need to ensure data migration

    // Check if we need to migrate from payments to movements
    const paymentCount = await ctx.db.query("payments").first();

    if (paymentCount) {
      // Run the migration if there are payments and no movements yet
      const movementCount = await ctx.db.query("movements").first();

      if (!movementCount) {
        // Import and run the migration
        // Run migration logic inline to avoid import issues
        const paymentStatuses = await ctx.db.query("paymentStatuses").collect();

        // Migrate payment statuses to movement statuses
        for (const status of paymentStatuses) {
          const existingStatus = await ctx.db
            .query("movementStatuses")
            .withIndex("by_nome", (q) => q.eq("nome", status.nome))
            .first();

          if (!existingStatus) {
            await ctx.db.insert("movementStatuses", {
              nome: status.nome,
              descrizione: status.descrizione,
              attivo: status.attivo,
              createdAt: status.createdAt,
              updatedAt: status.updatedAt,
            });
          }
        }

        // Migrate payments to movements
        const payments = await ctx.db.query("payments").collect();
        const movementStatuses = await ctx.db.query("movementStatuses").collect();

        const statusMapping: Record<string, any> = {};
        for (const oldStatus of paymentStatuses) {
          const newStatus = movementStatuses.find((s) => s.nome === oldStatus.nome);
          if (newStatus) {
            statusMapping[oldStatus._id] = newStatus._id;
          }
        }

        for (const payment of payments) {
          let executedAt: number | undefined = undefined;
          if (payment.paidAt) {
            executedAt = new Date(payment.paidAt).getTime();
          }

          await ctx.db.insert("movements", {
            title: payment.title,
            description: payment.description,
            type: "OUT",
            amountPlanned: payment.amountPlanned,
            dueDate: payment.dueDate,
            statusId: statusMapping[payment.statusId as string],
            isRecurring: payment.isRecurring,
            recurrenceType: payment.recurrenceType,
            everyNMonths: payment.everyNMonths,
            customDates: payment.customDates,
            parentId: payment.parentId as any,
            executedAt,
            amountActual: payment.amountPaid,
            executedNote: payment.paidNote,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          });
        }

        return { success: true, migratedPayments: payments.length };
      }
    }

    return { success: true, message: "Schema already up to date" };
  },
});
