/**
 * Association Year Utilities for Convex Functions
 *
 * Handles the calculation and management of association years for ODV (Organizzazione di Volontariato).
 * The association year runs from September 1st to August 31st of the following year.
 *
 * Note: This is a duplicate of src/utils/associationYear.ts for use in Convex functions,
 * since Convex functions cannot import from the src/ directory.
 *
 * Requirements:
 * - Req 3.1: If month >= September, associationYear = current year
 * - Req 3.2: If month <= August, associationYear = previous year
 * - Req 3.3: Generate labels in format "YYYY/YYYY+1"
 * - Req 3.4: Membership expiration is August 31st of endYear
 */

/**
 * Represents an association year with start year, end year, and formatted label.
 */
export interface AssociationYear {
  /** The starting year of the association year (September of this year) */
  startYear: number;
  /** The ending year of the association year (August of this year) */
  endYear: number;
  /** Formatted label in "YYYY/YYYY+1" format (e.g., "2025/2026") */
  label: string;
}

/**
 * Calculates the association year for a given date.
 *
 * The association year follows these rules:
 * - If the month is September (9) or later, the start year is the current year
 * - If the month is August (8) or earlier, the start year is the previous year
 *
 * @param date - The date to calculate the association year for (defaults to current date)
 * @returns An AssociationYear object with startYear, endYear, and label
 *
 * @example
 * // For a date in October 2025
 * calculateAssociationYear(new Date('2025-10-15'))
 * // Returns: { startYear: 2025, endYear: 2026, label: '2025/2026' }
 *
 * @example
 * // For a date in March 2025
 * calculateAssociationYear(new Date('2025-03-15'))
 * // Returns: { startYear: 2024, endYear: 2025, label: '2024/2025' }
 *
 * @validates Requirements 3.1, 3.2, 3.3
 */
export function calculateAssociationYear(date: Date = new Date()): AssociationYear {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  const year = date.getFullYear();

  let startYear: number;
  let endYear: number;

  if (month >= 9) {
    // September or later: association year starts in current year
    startYear = year;
    endYear = year + 1;
  } else {
    // August or earlier: association year started in previous year
    startYear = year - 1;
    endYear = year;
  }

  return {
    startYear,
    endYear,
    label: `${startYear}/${endYear}`,
  };
}

/**
 * Gets the end date of an association year as an ISO date string.
 *
 * This is useful for storing the expiration date in the database.
 * The expiration is always August 31st of the end year.
 *
 * @param endYear - The end year of the association year
 * @returns An ISO date string in "YYYY-08-31" format
 *
 * @example
 * getAssociationYearEndISO(2026)
 * // Returns: "2026-08-31"
 *
 * @validates Requirements 3.4, 4.5
 */
export function getAssociationYearEndISO(endYear: number): string {
  return `${endYear}-08-31`;
}

/**
 * Checks if the given association year is the current association year.
 *
 * @param startYear - The start year to check
 * @param endYear - The end year to check
 * @returns true if the given years match the current association year, false otherwise
 *
 * @example
 * // If current date is October 2025 (association year 2025/2026)
 * isCurrentAssociationYear(2025, 2026) // Returns: true
 * isCurrentAssociationYear(2024, 2025) // Returns: false
 *
 * @validates Requirements 3.1, 3.2
 */
export function isCurrentAssociationYear(startYear: number, endYear: number): boolean {
  const current = calculateAssociationYear();
  return current.startYear === startYear && current.endYear === endYear;
}

/**
 * Generates the association year label from start and end years.
 *
 * @param startYear - The start year
 * @param endYear - The end year
 * @returns Formatted label in "YYYY/YYYY+1" format
 *
 * @example
 * getAssociationYearLabel(2025, 2026)
 * // Returns: "2025/2026"
 *
 * @validates Requirements 3.3
 */
export function getAssociationYearLabel(startYear: number, endYear: number): string {
  return `${startYear}/${endYear}`;
}
