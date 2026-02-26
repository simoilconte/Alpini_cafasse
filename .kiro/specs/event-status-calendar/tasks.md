# Implementation Plan: Event Status Calendar

## Overview

Implementazione incrementale delle transizioni di stato eventi, auto-chiusura cron, e visualizzazione calendario mensile per eventi chiusi. Ogni task costruisce sul precedente, partendo dal backend e collegando progressivamente il frontend.

## Tasks

- [x] 1. Implement backend status transition mutation and closed event protection
  - [x] 1.1 Add `updateEventStatus` mutation to `convex/events.ts`
    - Define `ALLOWED_TRANSITIONS` map: `{ pianificato: ["confermato", "chiuso"], confermato: ["chiuso"], chiuso: [] }`
    - Implement mutation with args `eventId` and `newStatus` (union of "confermato", "chiuso")
    - Validate transition using the map, throw descriptive error if invalid: `"Transizione non consentita: da {current} a {new}"`
    - Call `requireAdminOrDirettivo(ctx)` for authorization
    - Patch event `stato` and `updatedAt`, create audit log with summary including old and new state
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Enforce closed event immutability in `updateEvent` mutation
    - Modify `updateEvent` in `convex/events.ts` to reject ALL field changes when `stato === "chiuso"` (remove the current exception that allows `args.stato === "chiuso"`)
    - Ensure error message: `"Non è possibile modificare un evento chiuso"`
    - _Requirements: 1.4_

  - [ ]* 1.3 Write property test for state transition validity (Property 1)
    - **Property 1: State transition validity is exhaustive**
    - Generate random (currentState, targetState) pairs from {"pianificato", "confermato", "chiuso"} × {"confermato", "chiuso"}
    - Verify success/error matches ALLOWED_TRANSITIONS map
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 1.4 Write property test for closed event immutability (Property 3)
    - **Property 3: Closed events are immutable**
    - Generate random field updates on closed events, verify all are rejected
    - **Validates: Requirements 1.4**

- [x] 2. Implement backend query for closed events by month
  - [x] 2.1 Add `listClosedEventsByMonth` query to `convex/events.ts`
    - Accept `year` (number) and `month` (1-12) as args
    - Query events with index `by_stato` for `stato === "chiuso"`
    - Filter in-memory: `dataInizio` falls within the specified month range
    - Sort by `dataInizio` ascending
    - For each event, count participants via `eventParticipants` index
    - Return: `{ _id, nome, dataInizio, dataFine, localita, durataMinuti, participantCount }`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 2.2 Write property test for monthly query correctness (Property 8)
    - **Property 8: Monthly closed events query returns correct results**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 3. Implement auto-close cron job
  - [x] 3.1 Add `autoCloseExpiredEvents` internal mutation to `convex/events.ts`
    - Add `createSystemAuditLog` helper that doesn't require auth context (uses "system" as actor)
    - Query events with `stato === "confermato"` using `by_stato` index
    - Filter: `dataFine < now` (ISO string comparison)
    - For each expired event: patch `stato` to "chiuso", `updatedAt` to now, create audit log with summary "Auto-chiusura: evento scaduto"
    - Wrap each event update in try/catch to continue on individual errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Create `convex/crons.ts` with hourly auto-close cron job
    - Import `cronJobs` from `convex/server` and `internal` from `./_generated/api`
    - Register `"auto-close-expired-events"` interval at `{ hours: 1 }` calling `internal.events.autoCloseExpiredEvents`
    - Export default crons
    - _Requirements: 4.1_

  - [ ]* 3.3 Write property test for auto-closure correctness (Property 4)
    - **Property 4: Auto-closure targets exactly expired confirmed events**
    - **Validates: Requirements 4.2, 4.3**

- [x] 4. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add status transition buttons to EventoDetailPage
  - [x] 5.1 Update `src/pages/EventoDetailPage.tsx` with "Conferma" and "Chiudi" buttons
    - Import and use `useMutation(api.events.updateEventStatus)`
    - When `stato === "pianificato"` and `canEdit`: show "Conferma" button and "Chiudi" button
    - When `stato === "confermato"` and `canEdit`: show "Chiudi" button only
    - When `stato === "chiuso"`: hide all action buttons (Modifica, Elimina, Conferma, Chiudi)
    - Add `ConfirmDialog` for "Chiudi" button (already exists for close, extend for confirm flow)
    - Show toast on error with backend error message
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Add quick status actions to EventCard
  - [x] 6.1 Update `src/components/events/EventCard.tsx` with status action buttons
    - Add quick action buttons in the card footer, visible only when `canEdit` and `stato !== "chiuso"`
    - For "pianificato": show "Conferma" and "Chiudi" buttons
    - For "confermato": show "Chiudi" button
    - Use `useMutation(api.events.updateEventStatus)` for transitions
    - Stop event propagation on button clicks to prevent navigation to detail page
    - Accept `canEdit` as a new prop from `EventiPage`
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Implement MonthlyCalendar component and integrate into EventiPage
  - [x] 7.1 Create `src/components/events/MonthlyCalendar.tsx`
    - Accept props: `year`, `month` (1-12), `onMonthChange`
    - Use `useQuery(api.events.listClosedEventsByMonth, { year, month })` to fetch data
    - Build calendar grid: 7 columns (Lun-Dom), rows to cover the month using `date-fns` helpers
    - Show event names in the cell matching `dataInizio` day
    - Max 2 events visible per day on desktop; show "+N altri" indicator when > 2
    - On mobile: show only numeric count indicator per day
    - Highlight current day with distinct style
    - Click on event navigates to `/eventi/{id}`
    - Navigation buttons for previous/next month
    - Display month name and year in header
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 7.2 Write property test for calendar grid structure (Property 5)
    - **Property 5: Calendar grid structure is correct for any month**
    - Extract grid-building logic into a pure utility function, test with random (year, month) pairs
    - **Validates: Requirements 6.1**

  - [ ]* 7.3 Write property test for event placement (Property 6)
    - **Property 6: Events are placed on the correct calendar day**
    - **Validates: Requirements 6.3**

  - [ ]* 7.4 Write property test for overflow indicator (Property 7)
    - **Property 7: Overflow indicator shows correct count**
    - **Validates: Requirements 6.4**

  - [x] 7.5 Integrate MonthlyCalendar into `src/pages/EventiPage.tsx`
    - Add `calendarYear` and `calendarMonth` local state (default to current month)
    - When `statoFilter === 'chiuso'`: render `MonthlyCalendar` instead of the card grid
    - When `statoFilter === 'tutti'` or `'confermato'`: render the existing card grid
    - Pass `canEdit` prop to `EventCard` components
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The project uses TypeScript, React, Convex, Tailwind CSS, and date-fns
