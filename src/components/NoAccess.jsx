import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';
import { firstLandingPath, permissionMessage } from '../lib/access';

/**
 * "This isn't for you" — said calmly.
 *
 * Deliberately not an error card. No red, no warning triangle, no "something went wrong": the
 * person did nothing wrong, nothing is broken, and there is nothing to retry. A lock in the
 * muted text colour reads as a closed door, which is what it is.
 *
 * `variant="widget"` sits inside a dashboard tile; `variant="page"` replaces a whole screen and
 * offers a way out that the person can actually walk through -- worked out from what they hold,
 * not hard-coded to the dashboard, which is exactly the loop this used to create.
 */
export default function NoAccess({ error, message, variant = 'widget', height }) {
  const { can } = usePermission();
  const text = message || permissionMessage(error);
  const isPage = variant === 'page';
  const somewhereElse = firstLandingPath(can);

  return (
    <div
      className={isPage ? undefined : 'stat-card'}
      style={{
        height: height || (isPage ? 'auto' : '100%'),
        minHeight: isPage ? '50vh' : 160,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 12, padding: isPage ? '64px 24px' : '24px'
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'var(--bg-subtle, rgba(0,0,0,0.04))', color: 'var(--text-muted, #71717a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Lock size={20} />
      </div>

      <div style={{ maxWidth: 420 }}>
        <h4 style={{
          fontSize: isPage ? 18 : 14, fontWeight: 600,
          color: 'var(--text-primary)', margin: '0 0 6px'
        }}>
          Not part of your role
        </h4>
        {/* The server's own sentence. It already names the thing and who to ask. */}
        <p style={{ fontSize: isPage ? 14 : 12.5, color: 'var(--text-muted, #71717a)', margin: 0, lineHeight: 1.5 }}>
          {text}
        </p>
      </div>

      {isPage && (
        <Link
          to={somewhereElse}
          style={{
            marginTop: 8, padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border-light)', color: 'var(--text-primary)',
            fontSize: 13, textDecoration: 'none'
          }}
        >
          Go to a page you can open
        </Link>
      )}
    </div>
  );
}
