import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Image as ImageIcon, CheckCircle, ArrowLeft } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import GarmentPhotoshootUploader from '../components/GarmentPhotoshootUploader';

export default function UploadPhotos() {
  const navigate = useNavigate();
  const { productData } = useProduct();

  const getViewLabels = () => {
    switch (productData.category) {
      case 'WOMEN':
        return ['BACK VIEW', 'TEXTURE/FABRIC', 'EMBROIDERY DETAIL', 'STYLING SHOT'];
      case 'MEN':
        return ['BACK VIEW', 'FABRIC DETAIL', 'COLLAR/CUFF', 'FULL LENGTH'];
      case 'KIDS':
        return ['BACK VIEW', 'COMFORT DETAIL', 'PATTERN/PRINT', 'FULL LENGTH'];
      default:
        return ['BACK VIEW', 'TEXTURE', 'DETAIL 1', 'DETAIL 2'];
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '100px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', paddingLeft: 0 }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          BACK
        </button>
      </div>

      <div style={{ display: 'flex', gap: '32px' }}>
      {/* Main Upload Section */}
      <div style={{ flex: 1 }}>
        <GarmentPhotoshootUploader onGenerationComplete={() => {}} />
      </div>



      {/* Fixed Bottom Actions for this view */}
      <div style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-dark)',
        borderTop: '1px solid var(--border-light)',
        padding: '16px 48px',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1400px' }}>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => navigate('/preview')}
          >
            REVIEW & PUBLISH PRODUCT
            <CheckCircle size={16} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
