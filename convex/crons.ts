import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "auto-close-expired-events",
  { hours: 1 },
  internal.events.autoCloseExpiredEvents
);

export default crons;
