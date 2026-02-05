/**
 * Payments (Scadenziario) Management
 * 
 * CRUD operations for scheduled payments (USCITE only).
 * Access: admin and direttivo can modify, operatore can only view
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireAdminOrDirettivo } from "./lib/auth";

/**
 * List payments with filters
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
    statusId: v.optional(v.id("paymentStatuses")),
    showPaid: v.optional(v.boolean()), // false = solo non pagati
    dueSoon: v.optional(v.boolean()), // true = scadenza entro 14 giorni
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let payments = await ctx.db.query("payments").collect();

    // Filter by status
    if (args.statusId) {
      payments = payments.filter((p) => p.statusId === args.statusId);
    }

    // Filter paid/unpaid
    if (args.showPaid === false) {
      payments = payments.filter((p) => !p.paidAt);
    }

    // Filter due soon (14 days)
    if (args.dueSoon) {
      const today = new Date();
      const in14Days = new Date(today);
      in14Days.setDate(in14Days.getDate() + 14);
      const todayStr = today.toISOString().split("T")[0];
      const in14DaysStr = in14Days.toISOString().split("T")[0];
      
      payments = payments.filter((p) => 
        !p.paidAt && p.dueDate >= todayStr && p.dueDate <= in14DaysStr
      );
    }

    // Filter by search
    if (args.search && args.search.trim()) {
      const searchLower = args.search.toLowerCase().trim();
      payments = payments.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    // Fetch related data
    const paymentsWithDetails = await Promise.all(
      payments.map(async (p) => {
        const status = await ctx.db.get(p.statusId);
        return {
          ...p,
          status,
        };
      })
    );

    // Sort by due date (nearest first)
    return paymentsWithDetails.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

/**
 * Get single payment
 */
export const get = query({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const payment = await ctx.db.get(args.id);
    if (!payment) return null;

    const status = await ctx.db.get(payment.statusId);

    return {
      ...payment,
      status,
    };
  },
});

/**
 * Create or update payment
 * Only admin and direttivo
 */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("payments")),
    title: v.string(),
    description: v.optional(v.string()),
    amountPlanned: v.optional(v.number()),
    dueDate: v.string(),
    statusId: v.id("paymentStatuses"),
    isRecurring: v.boolean(),
    recurrenceType: v.optional(v.union(v.literal("EVERY_N_MONTHS"), v.literal("CUSTOM_DATES"))),
    everyNMonths: v.optional(v.number()),
    customDates: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);

    const now = Date.now();
    const { id, ...data } = args;

    // Validate status is active
    const status = await ctx.db.get(data.statusId);
    if (!status || !status.attivo) {
      throw new Error("Lo stato selezionato non è attivo");
    }

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      return id;
    } else {
      return await ctx.db.insert("payments", {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Mark payment as paid
 * Generates next occurrence for recurring payments
 */
export const markAsPaid = mutation({
  args: {
    id: v.id("payments"),
    amountPaid: v.optional(v.number()),
    paidNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);

    const payment = await ctx.db.get(args.id);
    if (!payment) throw new Error("Pagamento non trovato");
    if (payment.paidAt) throw new Error("Pagamento già saldato");

    const now = Date.now();
    const paidAt = new Date().toISOString().split("T")[0];

    // Mark as paid
    await ctx.db.patch(args.id, {
      paidAt,
      amountPaid: args.amountPaid ?? payment.amountPlanned,
      paidNote: args.paidNote,
      updatedAt: now,
    });

    // Generate next occurrence for recurring payments
    if (payment.isRecurring) {
      let nextDueDate: string | null = null;

      if (payment.recurrenceType === "EVERY_N_MONTHS" && payment.everyNMonths) {
        const currentDue = new Date(payment.dueDate);
        currentDue.setMonth(currentDue.getMonth() + payment.everyNMonths);
        nextDueDate = currentDue.toISOString().split("T")[0];
      } else if (payment.recurrenceType === "CUSTOM_DATES" && payment.customDates) {
        // Find next date after current due date
        const sortedDates = [...payment.customDates].sort();
        const nextDate = sortedDates.find((d) => d > payment.dueDate);
        if (nextDate) {
          nextDueDate = nextDate;
        }
      }

      if (nextDueDate) {
        await ctx.db.insert("payments", {
          title: payment.title,
          description: payment.description,
          amountPlanned: payment.amountPlanned,
          dueDate: nextDueDate,
          statusId: payment.statusId,
          isRecurring: payment.isRecurring,
          recurrenceType: payment.recurrenceType,
          everyNMonths: payment.everyNMonths,
          customDates: payment.customDates,
          parentId: args.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return args.id;
  },
});

/**
 * Delete payment
 * Only admin and direttivo
 */
export const remove = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Get dashboard stats for current month
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const payments = await ctx.db.query("payments").collect();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    // Current month boundaries
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const monthEndStr = monthEnd.toISOString().split("T")[0];

    // 7 days from now
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split("T")[0];

    // 14 days from now
    const in14Days = new Date(today);
    in14Days.setDate(in14Days.getDate() + 14);
    const in14DaysStr = in14Days.toISOString().split("T")[0];

    // Filter unpaid payments
    const unpaid = payments.filter((p) => !p.paidAt);

    // Due this month (unpaid)
    const dueThisMonth = unpaid.filter(
      (p) => p.dueDate >= monthStartStr && p.dueDate <= monthEndStr
    );

    // Due in 7 days (unpaid)
    const dueIn7Days = unpaid.filter(
      (p) => p.dueDate >= todayStr && p.dueDate <= in7DaysStr
    );

    // Due in 14 days (unpaid)
    const dueIn14Days = unpaid.filter(
      (p) => p.dueDate >= todayStr && p.dueDate <= in14DaysStr
    );

    // Overdue (unpaid, past due date)
    const overdue = unpaid.filter((p) => p.dueDate < todayStr);

    // Total planned amount for this month
    const totalPlannedThisMonth = dueThisMonth.reduce(
      (sum, p) => sum + (p.amountPlanned || 0),
      0
    );

    return {
      dueThisMonthCount: dueThisMonth.length,
      dueIn7DaysCount: dueIn7Days.length,
      dueIn14DaysCount: dueIn14Days.length,
      overdueCount: overdue.length,
      totalPlannedThisMonth,
      dueThisMonth,
      dueIn7Days,
      overdue,
    };
  },
});
