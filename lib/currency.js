/**
 * Centralized Currency Formatter for GymOS
 * Defaulting to India (INR)
 */
export function formatCurrency(amount, currencyCode = 'INR') {
    if (isNaN(amount) || amount === null || amount === undefined) {
        return '₹0';
    }

    // Explicit INR rule since 99% of GymOS is in INR natively
    if (currencyCode === 'INR') {
        const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        });
        return formatter.format(amount);
    }

    // Generic fallback for future international scale
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
    });
    return formatter.format(amount);
}
