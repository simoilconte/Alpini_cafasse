import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const migratePaymentsToMovements = internalMutation({
  handler: async (ctx) => {
    // 1. Migra gli stati da paymentStatuses a movementStatuses
    const paymentStatuses = await ctx.db.query("paymentStatuses").collect();

    for (const status of paymentStatuses) {
      // Verifica se già esiste in movementStatuses
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

    // 2. Migra i pagamenti a movimenti
    const payments = await ctx.db.query("payments").collect();
    const movementStatuses = await ctx.db.query("movementStatuses").collect();

    // Crea mapping da paymentStatuses a movementStatuses
    const statusMapping: Record<string, any> = {};
    for (const oldStatus of paymentStatuses) {
      const newStatus = movementStatuses.find((s) => s.nome === oldStatus.nome);
      if (newStatus) {
        statusMapping[oldStatus._id] = newStatus._id;
      }
    }

    for (const payment of payments) {
      // Converti paidAt da string a number (timestamp)
      let executedAt: number | undefined = undefined;
      if (payment.paidAt) {
        executedAt = new Date(payment.paidAt).getTime();
      }

      await ctx.db.insert("movements", {
        title: payment.title,
        description: payment.description,
        type: "OUT", // Tutti i pagamenti esistenti sono uscite
        amountPlanned: payment.amountPlanned,
        dueDate: payment.dueDate,
        statusId: statusMapping[payment.statusId as string],
        isRecurring: payment.isRecurring,
        recurrenceType: payment.recurrenceType,
        everyNMonths: payment.everyNMonths,
        customDates: payment.customDates,
        parentId: payment.parentId as any, // Cast temporaneo per migrazione
        executedAt,
        amountActual: payment.amountPaid,
        executedNote: payment.paidNote,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      });
    }

    console.log(`Migrated ${payments.length} payments to movements`);
    console.log(`Migrated ${paymentStatuses.length} payment statuses to movement statuses`);
  },
});
