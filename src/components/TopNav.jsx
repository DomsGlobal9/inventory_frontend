import React, { useState } from 'react';
import { Search, Bell, Settings, User, Menu, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function TopNav({ onMenuClick }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsSearching(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        const data = response.data?.data;
        
        if (data) {
          // If we found a variant, navigate to variant tab
          if (data.variants && data.variants.length > 0) {
            navigate(data.variants[0].url);
            setQuery(''); // Clear after successful scan
          } 
          // Else if we found a product, navigate to product
          else if (data.products && data.products.length > 0) {
            navigate(data.products[0].url);
            setQuery(''); // Clear after successful scan
          }
          // Note: V2 would show a dropdown for multiple fuzzy results. 
          // For V1 hardware scanner support, jumping to the first exact match is best.
        }
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 48px',
      height: '80px',
      borderBottom: '1px solid var(--border-light)',
      backgroundColor: 'var(--bg-card)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        {/* Mobile Hamburger Menu */}
        <button 
          className="btn-icon mobile-only-icon" 
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
        <style>{`
          .mobile-only-icon { display: none; }
          @media (max-width: 768px) {
            .mobile-only-icon { display: block; color: var(--text-primary); }
          }
        `}</style>

        <div className="mobile-hide" style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          padding: '10px 16px',
          width: '400px',
          maxWidth: '100%'
        }}>
          {isSearching ? (
            <Loader2 size={18} className="animate-spin" color="var(--text-secondary)" style={{ marginRight: '12px', flexShrink: 0 }} />
          ) : (
            <Search size={18} color="var(--text-secondary)" style={{ marginRight: '12px', flexShrink: 0 }} />
          )}
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search products, SKU, barcode..." 
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            width: '100%',
            fontSize: '14px',
          }}
        />
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn-icon"><Bell size={20} /></button>
        <button className="btn-icon"><Settings size={20} /></button>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '8px',
          color: 'var(--bg-dark)'
        }}>
          <User size={18} />
        </div>
      </div>
    </nav>
  );
}
