/** Shared backend utility for format date operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
/** Formats date for input.
 * Accepts dateInput; returns the derived value. */
export const formatDateForInput = (dateInput) => {
    if (!dateInput) return null;

    const date = new Date(dateInput);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};
