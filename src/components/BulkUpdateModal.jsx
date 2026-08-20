import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCSV } from '../utils/csvUtils';
import { useBulkUpdateVariants } from '../hooks/useVariants';

export default function BulkUpdateModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [errors, setErrors] = useState([]);
  
  const bulkUpdateMutation = useBulkUpdateVariants();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setParsedData(null);

    try {
      const data = await parseCSV(selectedFile);
      validateData(data);
    } catch (err) {
      setErrors(['Failed to parse CSV file.']);
    }
  };

  const validateData = (data) => {
    const newErrors = [];
    const validUpdates = [];

    if (data.length === 0) {
      newErrors.push('The CSV file is empty.');
    } else {
      data.forEach((row, index) => {
        // Skip empty rows (papaparse might leave a trailing empty row)
        if (Object.keys(row).length === 0 || !row.sku && !row.SKU) return;

        const sku = row.sku || row.SKU;
        if (!sku) {
          newErrors.push(`Row ${index + 2}: Missing SKU.`);
          return;
        }

        const update = { sku: String(sku).trim() };
        let hasUpdate = false;

        const quantity = row.quantity !== undefined ? row.quantity : row.Quantity;
        if (quantity !== undefined && quantity !== null && quantity !== '') {
          if (isNaN(Number(quantity)) || Number(quantity) < 0) {
            newErrors.push(`Row ${index + 2} (${sku}): Invalid quantity.`);
          } else {
            update.quantity = Number(quantity);
            hasUpdate = true;
          }
        }

        const priceOverride = row.priceOverride !== undefined ? row.priceOverride : row.PriceOverride;
        if (priceOverride !== undefined && priceOverride !== null && priceOverride !== '') {
          if (isNaN(Number(priceOverride)) || Number(priceOverride) < 0) {
            newErrors.push(`Row ${index + 2} (${sku}): Invalid price override.`);
          } else {
            update.priceOverride = Number(priceOverride);
            hasUpdate = true;
          }
        }

        const reorderLevel = row.reorderLevel !== undefined ? row.reorderLevel : row.ReorderLevel;
        if (reorderLevel !== undefined && reorderLevel !== null && reorderLevel !== '') {
          if (isNaN(Number(reorderLevel)) || Number(reorderLevel) < 0) {
            newErrors.push(`Row ${index + 2} (${sku}): Invalid reorder level.`);
          } else {
            update.reorderLevel = Number(reorderLevel);
            hasUpdate = true;
          }
        }

        if (!hasUpdate) {
          newErrors.push(`Row ${index + 2} (${sku}): No valid update fields provided.`);
        } else {
          validUpdates.push(update);
        }
      });
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
    } else if (validUpdates.length > 0) {
      setParsedData(validUpdates);
    } else {
      setErrors(['No valid updates found in CSV.']);
    }
  };

  const handleImport = () => {
    if (!parsedData) return;
    bulkUpdateMutation.mutate(parsedData, {
      onSuccess: () => {
        handleClose();
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setErrors([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, y: '-50%', scale: 1, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              width: '90%',
              maxWidth: '500px',
              backgroundColor: 'var(--bg-dark)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              zIndex: 1000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Import Bulk Updates</h3>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Update stock, price, or reorder levels via CSV.
                </p>
              </div>
              <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Required CSV format (headers are case-insensitive):
                </p>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                  sku,quantity,priceOverride,reorderLevel<br />
                  SKU-001,100,1999.00,10<br />
                  SKU-002,50,,<br />
                  SKU-003,,2499,
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Only <code>sku</code> is strictly required. Any other column provided will update that field.
                </p>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="csv-upload"
              />
              <label 
                htmlFor="csv-upload"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 24px',
                  border: '2px dashed var(--border-light)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s',
                  marginBottom: '24px'
                }}
              >
                <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: '16px' }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                  {file ? file.name : 'Click to select CSV file'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  {file ? `${(file.size / 1024).toFixed(2)} KB` : 'or drag and drop'}
                </span>
              </label>

              {errors.length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', marginBottom: '8px' }}>
                    <AlertCircle size={16} />
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>Validation Errors</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '14px' }}>
                    {errors.map((err, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedData && errors.length === 0 && (
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <FileText size={16} />
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>Ready to import {parsedData.length} valid updates.</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleImport}
                disabled={!parsedData || errors.length > 0 || bulkUpdateMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {bulkUpdateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import Updates
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
