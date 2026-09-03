import React, { useRef, useState } from 'react';
import { Upload, X, Star, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useImages, useUploadImage, useDeleteImage, useUpdateImage } from '../hooks/useImages';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

export default function ImageGallery({ productId }) {
  const fileInputRef = useRef(null);
  const { data, isLoading } = useImages(productId);
  const uploadMutation = useUploadImage(productId);
  const deleteMutation = useDeleteImage(productId);
  const updateMutation = useUpdateImage(productId);

  const images = data || [];
  const [confirmState, setConfirmState] = useState({ isOpen: false });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    // Determine if it should be primary
    const isPrimary = images.length === 0;

    uploadMutation.mutate({ file, isPrimary });
    
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setPrimary = (imageId) => {
    // We update this image to primary=true. 
    // A robust backend would unset primary on others automatically.
    updateMutation.mutate({ imageId, data: { isPrimary: true } });
  };

  const handleDelete = (imageId) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image?',
      confirmText: 'Delete',
      confirmStyle: 'danger',
      onConfirm: () => {
        deleteMutation.mutate(imageId);
      }
    });
  };

  if (isLoading) return <div style={{ padding: '32px', color: 'var(--text-muted)' }}>Loading images...</div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Product Images</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Upload and manage product photos.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          <button 
            className="btn-primary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {images.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No images uploaded yet.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="show"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}
          >
            <AnimatePresence>
              {images.map((image) => (
                <motion.div 
                  variants={itemVariants}
                  key={image.id}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{ 
                    position: 'relative', 
                    aspectRatio: '1/1', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    border: image.isPrimary ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: 'var(--bg-input)'
                  }}
                >
                  <img 
                    src={image.url} 
                    alt={image.altText || 'Product image'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  
                  {/* Overlay Controls */}
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, 
                    padding: '8px', display: 'flex', justifyContent: 'space-between',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)'
                  }}>
                    {image.isPrimary ? (
                      <span style={{ 
                        background: 'var(--accent-gold)', color: '#000', 
                        padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' 
                      }}>
                        PRIMARY
                      </span>
                    ) : (
                      <button 
                        onClick={() => setPrimary(image.id)}
                        disabled={updateMutation.isPending}
                        style={{ color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '4px' }}
                        title="Set as Primary"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(image.id)}
                      disabled={deleteMutation.isPending}
                      style={{ color: '#fff', background: 'rgba(239, 68, 68, 0.8)', padding: '4px', borderRadius: '4px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmStyle={confirmState.confirmStyle}
      />
    </div>
  );
}
