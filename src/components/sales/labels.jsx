import React from 'react';

/**
 * The words a shop reads for the states and reasons stored in the database, in one place.
 *
 * Every screen used to print its own copy -- or the raw value: the Orders list said "Partly sent"
 * while the order it opened said PARTIALLY_DISPATCHED, and a return turned down with the "Turn down"
 * button came back reading REJECTED. One map per thing means a word can only be changed everywhere.
 *
 * Colours are "r, g, b" so the pill can draw a pale background from the same colour as its text.
 */

export const ORDER_STATUS = {
  DRAFT: { label: 'Draft', color: '107, 114, 128' },
  CONFIRMED: { label: 'Confirmed', color: '59, 130, 246' },
  PARTIALLY_DISPATCHED: { label: 'Partly sent', color: '245, 158, 11' },
  DISPATCHED: { label: 'Dispatched', color: '16, 185, 129' },
  CANCELLED: { label: 'Cancelled', color: '239, 68, 68' }
};

export const RETURN_STATUS = {
  REQUESTED: { label: 'Requested', color: '245, 158, 11' },
  RECEIVED: { label: 'Received', color: '59, 130, 246' },
  INSPECTED: { label: 'Inspected', color: '139, 92, 246' },
  COMPLETED: { label: 'Completed', color: '16, 185, 129' },
  REJECTED: { label: 'Turned down', color: '239, 68, 68' }
};

/** In the order the return form offers them. `value` is what the server stores and validates. */
export const RETURN_REASONS = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged on the way to the customer' },
  { value: 'DEFECTIVE', label: 'Faulty or badly made' },
  { value: 'WRONG_ITEM', label: 'We sent the wrong thing' },
  { value: 'SIZE_ISSUE', label: 'Size did not fit' },
  { value: 'CUSTOMER_REJECTED', label: 'Customer changed their mind' },
  { value: 'OTHER', label: 'Something else' }
];

export const RETURN_DISPOSITION = {
  PENDING: { label: 'Not inspected yet', color: '245, 158, 11' },
  RESTOCK: { label: 'Restock', color: '16, 185, 129' },
  DAMAGED: { label: 'Damaged', color: '239, 68, 68' },
  SCRAP: { label: 'Scrap', color: '107, 114, 128' }
};

export const DISPATCH_STATUS = {
  PENDING: { label: 'Waiting', color: '107, 114, 128' },
  PICKING: { label: 'Being picked', color: '245, 158, 11' },
  PACKED: { label: 'Packed', color: '59, 130, 246' },
  SHIPPED: { label: 'Sent', color: '59, 130, 246' },
  DELIVERED: { label: 'Delivered', color: '16, 185, 129' },
  CANCELLED: { label: 'Cancelled', color: '239, 68, 68' }
};

export const CUSTOMER_STATUS = {
  ACTIVE: { label: 'Active', color: '16, 185, 129' },
  INACTIVE: { label: 'Inactive', color: '107, 114, 128' },
  ARCHIVED: { label: 'Archived', color: '239, 68, 68' }
};

const GREY = '107, 114, 128';

/**
 * A value's entry, or a readable stand-in for one this screen has never heard of (a status added on
 * the server later): "SOME_NEW_STATE" still reads "Some new state" rather than shouting.
 */
export function describe(map, value) {
  if (map[value]) return map[value];
  const text = String(value ?? '').replace(/_/g, ' ').toLowerCase();
  return { label: text ? text[0].toUpperCase() + text.slice(1) : '—', color: GREY };
}

export const returnReasonLabel = (value) =>
  RETURN_REASONS.find(r => r.value === value)?.label ?? describe({}, value).label;

/** The coloured pill every list and detail page uses for a status. */
export function StatusPill({ map, value, size = 'normal' }) {
  const { label, color } = describe(map, value);
  const big = size === 'large';
  return (
    <span style={{
      padding: big ? '4px 10px' : '3px 8px', borderRadius: 12, fontSize: big ? 13 : 12, fontWeight: 500,
      background: `rgba(${color}, 0.12)`, color: `rgb(${color})`, display: 'inline-block', whiteSpace: 'nowrap'
    }}>
      {label}
    </span>
  );
}
