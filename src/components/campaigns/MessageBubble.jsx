import React from 'react';
import { whatsappMarks } from '../../utils/campaignText';

/**
 * A message as WhatsApp shows it: a green bubble, the picture on top when there is one, *bold* and
 * _italic_ as the phone draws them, and web addresses in link blue. No pretend link card under a
 * picture -- WhatsApp shows none there, so neither does this.
 */
const LINKS = /((?:https?:\/\/)?go\.scaleezy\.com\/\S+|https?:\/\/\S+|localhost:\d+\/l\/\S+)/g;

function withLinks(text, key) {
  const parts = text.split(LINKS);
  return parts.map((p, i) => (i % 2 === 1
    ? <span key={`${key}-${i}`} style={{ color: 'rgb(2,132,199)', textDecoration: 'underline', overflowWrap: 'anywhere' }}>{p}</span>
    : <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>));
}

export default function MessageBubble({ text, image }) {
  return (
    <div style={{ background: 'rgba(37,211,102,0.14)', borderRadius: '10px 10px 10px 2px', padding: image ? '4px 4px 10px' : '10px 12px', fontSize: '14px', lineHeight: 1.45 }}>
      {image && (
        <img src={image} alt="The picture above the message" style={{ display: 'block', width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
      )}
      <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: image ? '0 8px' : 0 }}>
        {whatsappMarks(text).map((part, n) => (
          typeof part === 'string' ? <React.Fragment key={`t${n}`}>{withLinks(part, `t${n}`)}</React.Fragment>
            : part.b !== undefined ? <strong key={`b${part.k}`}>{withLinks(part.b, `b${part.k}`)}</strong>
            : <em key={`i${part.k}`} style={{ color: 'var(--text-secondary)' }}>{part.i}</em>
        ))}
      </div>
    </div>
  );
}
