import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Undo2, SearchCheck, UserPlus, ArrowLeftRight } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../utils/formatUtils';
import { useLocationContext } from '../../contexts/LocationContext';
import SummaryCard from './SummaryCard';

/**
 * "Your day": the tiles that follow the person's own permissions.
 *
 * The server sends only the figures this person may see (services/my-day.service.ts), so a
 * salesperson, a warehouse hand and a shop's own custom role each get their own row without this
 * screen knowing any role by name. Nothing to show means nothing rendered -- never a box saying
 * what they cannot see.
 */
export default function MyDayCards() {
  const { currentLocation } = useLocationContext();
  const { data } = useQuery({
    queryKey: ['dashboard', 'my-day', currentLocation?.id ?? 'all'],
    queryFn: async () => (await api.get('/dashboard/my-day')).data ?? {},
    staleTime: 60 * 1000
  });
  if (!data) return null;

  const cards = [
    data.bills && { title: "Today's bills", value: data.bills.count, note: formatINR(data.bills.total), icon: Receipt, color: 'var(--accent-success)', to: '/orders' },
    data.returnsWaiting != null && { title: 'Returns waiting', value: data.returnsWaiting, note: 'Not finished yet', icon: Undo2, color: data.returnsWaiting ? 'var(--accent-warning)' : 'var(--text-secondary)', to: '/returns' },
    data.returnsToInspect != null && { title: 'Returns to inspect', value: data.returnsToInspect, note: 'Received, not checked', icon: SearchCheck, color: data.returnsToInspect ? 'var(--accent-warning)' : 'var(--text-secondary)', to: '/returns' },
    data.customersToday != null && { title: 'Customers added today', value: data.customersToday, icon: UserPlus, color: 'var(--accent-gold)', to: '/customers' },
    data.transfersOnTheWay != null && { title: 'Transfers on the way', value: data.transfersOnTheWay, note: 'Approved or in transit', icon: ArrowLeftRight, color: '#3b82f6', to: '/inventory/transfers' }
  ].filter(Boolean);
  if (cards.length === 0) return null;

  return (
    <section aria-label="Your day" className="dashboard-grid">
      {cards.map(card => (
        <Link key={card.title} to={card.to} className="dash-focus" style={{ display: 'block', color: 'inherit', textDecoration: 'none', borderRadius: '12px' }}>
          <SummaryCard title={card.title} value={card.value} note={card.note} icon={card.icon} colorClass={card.color} clickable />
        </Link>
      ))}
    </section>
  );
}
