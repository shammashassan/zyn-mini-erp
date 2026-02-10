// utils/inventoryConstants.ts

/**
 * Predefined standard units for materials
 * These are enforced in the Material model and form
 */
export const ALLOWED_MATERIAL_UNITS = [
    'piece',
    'kilogram',
    'gram',
    'milligram',
    'liter',
    'milliliter',
    'meter',
    'centimeter',
    'millimeter',
    'squaremeter',
    'foot',
    'inch',
    'box',
    'pack',
    'roll',
    'set',
    'can',
    'dozen',
] as const;

export type MaterialUnit = typeof ALLOWED_MATERIAL_UNITS[number];
