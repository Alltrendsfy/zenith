/**
 * Shared utilities for route modules
 */

// Helper to get user ID from request
export function getUserId(req: any): string {
    return req.user?.id || req.user?.claims?.sub;
}

// Converts YYYY-MM-DD string to Date object using UTC timezone
// Validates format and values to prevent invalid dates
export function stringToDate(dateString: string): Date {
    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
    }

    const [year, month, day] = dateString.split('-').map(Number);

    // Validate month (1-12)
    if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
    }

    // Validate day (1-31, basic validation)
    if (day < 1 || day > 31) {
        throw new Error(`Invalid day: ${day}. Must be between 1 and 31`);
    }

    // Create Date in UTC to avoid timezone issues
    const date = new Date(Date.UTC(year, month - 1, day));

    // Additional validation: check if the date is valid
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateString}`);
    }

    return date;
}
