import React from 'react';
import { whatsappMarks } from '../../utils/campaignText';

/** A message as WhatsApp shows it: a green bubble, *bold* and _italic_ as the phone draws them. */
export default function MessageBubble({ text }) {
  return (
    <div style={{ background: 'rgba(37,211,102,0.14)', borderRadius: '10px 10px 10px 2px', padding: '10px 12px', whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
      {whatsappMarks(text).map((part, n) => (
        typeof part === 'string' ? <React.Fragment key={`t${n}`}>{part}</React.Fragment>
          : part.b !== undefined ? <strong key={`b${part.k}`}>{part.b}</strong>
          : <em key={`i${part.k}`} style={{ color: 'var(--text-secondary)' }}>{part.i}</em>
      ))}
    </div>
  );
}
