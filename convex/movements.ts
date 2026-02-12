import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// List movements con filtri avanzati
export const list = query({
  args: {
    search: v.optional(v.string()),
    typeId: v.optional(v.union(v.literal("IN"), v.literal("OUT"))),
    statusId: v.optional(v.id("movementStatuses")),
    startDate: v.optional(v.string()), // YYYY-MM-DD
    endDate: v.optional(v.string()), // YYYY-MM-DD
    showOnlyDue: v.optional(v.boolean()),
    showOnlyOverdue: v.optional(v.boolean()),
    showExecuted: v.optional(v.boolean()), // default: false
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    let movementsQuery = ctx.db.query("movements");

    // Filter by date range
    if (args.startDate || args.endDate) {
      // Per ora applichiamo filtro base, poi rifiniamo con asSystem
      movementsQuery = movementsQuery;
    }

    const movements = await movementsQuery.order("desc").collect();

    // Get statuses for join
    const statuses = await ctx.db.query("movementStatuses").collect();
    const statusMap = new Map(statuses.map((s) => [s._id, s]));

    // Apply filters and enrich data
    let filteredMovements = movements
      .map((movement) => ({
        ...movement,
        status: statusMap.get(movement.statusId),
        // Calculate urgency badges
        urgencyInfo: getUrgencyInfo(movement.dueDate, movement.executedAt),
      }))
      .filter((movement) => {
        // Search filter
        if (args.search) {
          const searchLower = args.search.toLowerCase();
          if (
            !movement.title.toLowerCase().includes(searchLower) &&
            !movement.description?.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
        }

        // Type filter
        if (args.typeId && movement.type !== args.typeId) {
          return false;
        }

        // Status filter
        if (args.statusId && movement.statusId !== args.statusId) {
          return false;
        }

        // Date range filter
        if (args.startDate && movement.dueDate < args.startDate) {
          return false;
        }
        if (args.endDate && movement.dueDate > args.endDate) {
          return false;
        }

        // Due/overdue filters
        if (args.showOnlyDue && !movement.urgencyInfo.isDueSoon) {
          return false;
        }
        if (args.showOnlyOverdue && !movement.urgencyInfo.isOverdue) {
          return false;
        }

        // Executed filter
        if (!args.showExecuted && movement.executedAt) {
          return false;
        }

        return true;
      });

    return filteredMovements;
  },
});

// Get movement by ID
export const get = query({
  args: { id: v.id("movements") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const movement = await ctx.db.get(args.id);
    if (!movement) return null;

    const status = await ctx.db.get(movement.statusId);

    return {
      ...movement,
      status,
      urgencyInfo: getUrgencyInfo(movement.dueDate, movement.executedAt),
    };
  },
});

// Create/update movement
export const upsert = mutation({
  args: {
    id: v.optional(v.id("movements")),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("IN"), v.literal("OUT")),
    amountPlanned: v.optional(v.number()),
    dueDate: v.string(),
    statusId: v.id("movementStatuses"),
    isRecurring: v.boolean(),
    recurrenceType: v.optional(v.union(v.literal("EVERY_N_MONTHS"), v.literal("CUSTOM_DATES"))),
    everyNMonths: v.optional(v.number()),
    customDates: v.optional(v.array(v.string())),
    parentId: v.optional(v.id("movements")),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          data: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check permissions (solo admin/direttivo possono modificare)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    if (args.id) {
      // Update existing
      await ctx.db.patch(args.id, {
        title: args.title,
        description: args.description,
        type: args.type,
        amountPlanned: args.amountPlanned,
        dueDate: args.dueDate,
        statusId: args.statusId,
        isRecurring: args.isRecurring,
        recurrenceType: args.recurrenceType,
        everyNMonths: args.everyNMonths,
        customDates: args.customDates,
        attachments: args.attachments,
        updatedAt: now,
      });
      return args.id;
    } else {
      // Create new
      const movementId = await ctx.db.insert("movements", {
        title: args.title,
        description: args.description,
        type: args.type,
        amountPlanned: args.amountPlanned,
        dueDate: args.dueDate,
        statusId: args.statusId,
        isRecurring: args.isRecurring,
        recurrenceType: args.recurrenceType,
        everyNMonths: args.everyNMonths,
        customDates: args.customDates,
        parentId: args.parentId,
        attachments: args.attachments,
        createdAt: now,
        updatedAt: now,
      });
      return movementId;
    }
  },
});

// Mark as executed (paid/received)
export const markAsExecuted = mutation({
  args: {
    id: v.id("movements"),
    executedAt: v.optional(v.number()),
    amountActual: v.optional(v.number()),
    executedNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check permissions
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Unauthorized");
    }

    const movement = await ctx.db.get(args.id);
    if (!movement) throw new Error("Movement not found");

    const now = args.executedAt || Date.now();

    // Mark current as executed
    await ctx.db.patch(args.id, {
      executedAt: now,
      amountActual: args.amountActual,
      executedNote: args.executedNote,
      updatedAt: now,
    });

    // If recurring, generate next occurrence
    if (movement.isRecurring && !movement.parentId) {
      const nextDueDate = calculateNextDueDate(
        movement.dueDate,
        movement.recurrenceType,
        movement.everyNMonths,
        movement.customDates
      );

      if (nextDueDate) {
        await ctx.db.insert("movements", {
          title: movement.title,
          description: movement.description,
          type: movement.type,
          amountPlanned: movement.amountPlanned,
          dueDate: nextDueDate,
          statusId: movement.statusId,
          isRecurring: movement.isRecurring,
          recurrenceType: movement.recurrenceType,
          everyNMonths: movement.everyNMonths,
          customDates: movement.customDates,
          parentId: movement._id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Delete movement
export const remove = mutation({
  args: { id: v.id("movements") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check permissions
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Unauthorized");
    }

    // Also delete child movements if this is a parent
    const childMovements = await ctx.db
      .query("movements")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    for (const child of childMovements) {
      await ctx.db.delete(child._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Generate upload URL for file attachments
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check permissions
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Unauthorized");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Dashboard stats con supporto entrate/uscite
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    // Get all movements
    const movements = await ctx.db.query("movements").collect();

    // Calculate stats for current month
    const currentMonthMovements = movements.filter((m) => m.dueDate.startsWith(currentMonth));

    const currentMonthIncomes = currentMonthMovements
      .filter((m) => m.type === "IN")
      .reduce(
        (sum, m) => sum + (m.executedAt && m.amountActual ? m.amountActual : m.amountPlanned || 0),
        0
      );

    const currentMonthExpenses = currentMonthMovements
      .filter((m) => m.type === "OUT")
      .reduce(
        (sum, m) => sum + (m.executedAt && m.amountActual ? m.amountActual : m.amountPlanned || 0),
        0
      );

    // Calculate urgency stats
    const urgencyStats = movements.reduce(
      (acc, m) => {
        const urgency = getUrgencyInfo(m.dueDate, m.executedAt);

        if (!m.executedAt && m.type === "OUT") {
          // Solo per uscite (comportamento precedente)
          if (urgency.isOverdue) acc.overdue++;
          else if (urgency.isDueSoon7) acc.due7++;
          else if (urgency.isDueSoon14) acc.due14++;
        }

        return acc;
      },
      { overdue: 0, due7: 0, due14: 0 }
    );

    return {
      currentMonth: {
        incomes: currentMonthIncomes,
        expenses: currentMonthExpenses,
        balance: currentMonthIncomes - currentMonthExpenses,
        totalMovements: currentMonthMovements.length,
      },
      urgency: urgencyStats,
    };
  },
});

// Helper functions
function getUrgencyInfo(dueDate: string, executedAt?: number) {
  if (executedAt) {
    return {
      isOverdue: false,
      isDueSoon7: false,
      isDueSoon14: false,
      isDueSoon: false,
      executed: true,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    isOverdue: diffDays < 0,
    isDueSoon7: diffDays >= 0 && diffDays <= 7,
    isDueSoon14: diffDays >= 0 && diffDays <= 14,
    isDueSoon: diffDays >= 0 && diffDays <= 14,
    executed: false,
    daysLeft: diffDays,
  };
}

function calculateNextDueDate(
  currentDueDate: string,
  recurrenceType?: "EVERY_N_MONTHS" | "CUSTOM_DATES",
  everyNMonths?: number,
  customDates?: string[]
): string | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (recurrenceType === "EVERY_N_MONTHS" && everyNMonths) {
    const current = new Date(currentDueDate);
    current.setMonth(current.getMonth() + everyNMonths);

    if (current > now) {
      return current.toISOString().slice(0, 10);
    }
  }

  if (recurrenceType === "CUSTOM_DATES" && customDates) {
    for (const date of customDates) {
      const due = new Date(date);
      if (due > now) {
        return date;
      }
    }
  }

  return null;
}
