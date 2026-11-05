import React from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { Menu, useOutside } from '../products/ProductFilters';

/**
 * The Customers page's filters, in the same look as Products and Orders (pf-* in index.css): one small
 * button per filter, a short list under it (a sheet on a phone), the choices made as chips, and the sort.
 * Price, craft and buying pattern are CRM's, on its customer list.
 */
export const CUSTOMER_FILTERS = [
  { key: 'bought', label: 'Bought', options: { has: 'Has bills', none: 'No bills yet' } },
  { key: 'source', label: 'Where from', options: { earlier: "Shop's earlier records", new: 'New in ScaleEzy' } },
  { key: 'phone', label: 'Phone', options: { has: 'Has a phone', none: 'No phone' } },
  { key: 'offers', label: 'WhatsApp offers', options: { agreed: 'Agreed', not: 'Not agreed', stopped: 'Said STOP' } },
  { key: 'added', label: 'Added', options: { today: 'Today', week: 'Last 7 days', month: 'Last 30 days' } }
];
const SORTS = { new: 'Newest first', old: 'Oldest first', name: 'Name, A to Z' };

const Choice = ({ on, onClick, children }) => (
  <button type="button" role="menuitemradio" aria-checked={on} className="pf-opt" onClick={onClick}>
    <span className="pf-box">{on && <Check size={12} />}</span><span className="pf-name">{children}</span><span />
  </button>
);

export default function CustomerFilters({ value, groups = [], onChange }) {
  const [open, setOpen] = React.useState(null);
  const close = React.useCallback(() => setOpen(null), []);
  useOutside(open, close);

  const button = (key, label, on, className) => (
    <button type="button" className={className ?? (on ? 'on' : '')} aria-expanded={open === key} aria-haspopup="menu" onClick={() => setOpen(open === key ? null : key)}>
      {label}{!className && on && <span className="pf-n">1</span>}<ChevronDown size={14} aria-hidden="true" />
    </button>
  );
  // Pressing the chosen one again takes it off.
  const pick = (key, v) => { onChange({ [key]: value[key] === v ? '' : v }); close(); };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
      {/* maxWidth: on a phone the buttons slide sideways inside this row, instead of pushing the whole page sideways. */}
      <div className="pf-bar" role="group" aria-label="Filter customers" style={{ minWidth: 0, maxWidth: '100%' }}>
        {groups.length > 0 && (
          <span className="pf-btn" data-pf-keep>
            {button('group', 'Group', !!value.group)}
            {open === 'group' && (
              <Menu label="Group" onClose={close}>
                {groups.map(g => (
                  <button key={g.key} type="button" role="menuitemradio" aria-checked={value.group === g.name} className="pf-opt" onClick={() => pick('group', g.name)}>
                    <span className="pf-box">{value.group === g.name && <Check size={12} />}</span>
                    <span className="pf-name">{g.name}</span><span className="pf-count">{g.count}</span>
                  </button>
                ))}
              </Menu>
            )}
          </span>
        )}
        {CUSTOMER_FILTERS.map(f => (
          <span key={f.key} className="pf-btn" data-pf-keep>
            {button(f.key, f.label, !!value[f.key])}
            {open === f.key && (
              <Menu label={f.label} onClose={close}>
                {Object.entries(f.options).map(([v, text]) => <Choice key={v} on={value[f.key] === v} onClick={() => pick(f.key, v)}>{text}</Choice>)}
              </Menu>
            )}
          </span>
        ))}
      </div>
      <span className="pf-btn" data-pf-keep>
        {button('sort', `Sort: ${SORTS[value.sort] ?? SORTS.new}`, false, 'pf-sort')}
        {open === 'sort' && (
          <Menu label="Sort" align="right" onClose={close}>
            {Object.entries(SORTS).map(([v, text]) => <Choice key={v} on={(value.sort || 'new') === v} onClick={() => { onChange({ sort: v === 'new' ? '' : v }); close(); }}>{text}</Choice>)}
          </Menu>
        )}
      </span>
    </div>
  );
}

/** The choices made, each with a cross, and Clear all. Nothing at all when none are made. */
export function ActiveCustomerFilters({ value, onChange, onClearAll }) {
  const chips = CUSTOMER_FILTERS.filter(f => f.options[value[f.key]]).map(f => ({ key: f.key, text: `${f.label}: ${f.options[value[f.key]]}` }));
  if (value.group) chips.unshift({ key: 'group', text: `Group: ${value.group}` });
  if (!chips.length) return null;
  return (
    <div className="pf-active">
      {chips.map(c => (
        <button key={c.key} type="button" className="pf-chip" onClick={() => onChange({ [c.key]: '' })} aria-label={`Remove ${c.text}`}>
          {c.text}<X size={13} aria-hidden="true" />
        </button>
      ))}
      <button type="button" className="pf-clear" onClick={onClearAll}>Clear all</button>
    </div>
  );
}
