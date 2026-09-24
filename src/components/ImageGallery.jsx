import React, { useRef, useState, useMemo } from 'react';
import LoadFailed from './LoadFailed';
import { Upload, X, Star, Loader2, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useImages, useUploadImage, useDeleteImage, useUpdateImage } from '../hooks/useImages';
import { useVariants } from '../hooks/useVariants';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PageLoader from './PageLoader';

/**
 * Photographs, arranged by the thing they are photographs OF.
 *
 * This was one flat pile per product. The schema has carried a variantId on every image since
 * the beginning and not one of the 54 images in the database used it -- so a shop selling a
 * saree in five colours uploaded five pictures into a heap, and nothing on the screen said
 * which colour still had none. "This product has photos" is not a useful answer when the red
 * one has three and the blue one has none; the customer looking at blue sees the red saree.
 *
 * So a section per variant, always listed even when empty. An empty section is the point: it
 * is the only way a missing photograph announces itself. Shots that belong to the product as a
 * whole -- the fabric, the border, the drape -- keep a section of their own.
 */

const describeVariant = (v) =>
  [v.colorName, v.size].filter(Boolean).join(' · ') || v.sku;

export default function ImageGallery({ productId }) {
  const fileInputRef = useRef(null);
  // Which section the file picker was opened from, so the upload lands where it was asked
  // for. null means the product as a whole.
  const [uploadTarget, setUploadTarget] = useState(null);

  const { data, isLoading, isError, error, refetch } = useImages(productId);
  const { data: variantData } = useVariants(productId);
  const uploadMutation = useUploadImage(productId);
  const deleteMutation = useDeleteImage(productId);
  const updateMutation = useUpdateImage(productId);

  const images = data || [];
  const variants = variantData?.data || variantData || [];
  const [confirmState, setConfirmState] = useState({ isOpen: false });

  /**
   * One group per variant plus one for the product, in the order the variants are listed.
   *
   * Built from the VARIANTS, not from the images -- that is what makes an empty group appear
   * at all. Grouping the images alone would show only the colours that already have one,
   * which is precisely the colours nobody needs reminding about.
   */
  const groups = useMemo(() => {
    const byVariant = new Map();
    for (const image of images) {
      const key = image.variantId || null;
      if (!byVariant.has(key)) byVariant.set(key, []);
      byVariant.get(key).push(image);
    }

    /*
     * Photographs that belong to no colour.
     *
     * Shown only when there ARE some, and with no way to add more. Every photograph now
     * belongs to a colour -- a shot filed against the product as a whole is shown for every
     * colour the shop sells, which is the lie this whole screen exists to stop. Older
     * products still carry some, so they are displayed and can be removed, but the section
     * disappears the moment the last one is gone rather than sitting there inviting more.
     */
    const loose = byVariant.get(null) || [];
    const sections = loose.length > 0 ? [{
      key: 'product',
      variantId: null,
      readOnly: true,
      title: 'Not tied to a colour',
      hint: 'Taken before photos were kept per colour. These show for every colour — move them by adding them to the colour they are of, then removing them here.',
      images: loose
    }] : [];

    for (const variant of variants) {
      sections.push({
        key: variant.id,
        variantId: variant.id,
        title: describeVariant(variant),
        hint: variant.sku,
        hexCode: variant.hexCode,
        images: byVariant.get(variant.id) || []
      });
    }
    return sections;
  }, [images, variants]);

  const missingCount = groups.filter(g => g.variantId && g.images.length === 0).length;

  const openPicker = (variantId) => {
    setUploadTarget(variantId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input first: picking the same file twice in a row fires no change event
    // otherwise, so a failed upload could not simply be retried with the same photo.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 5MB.');
      return;
    }

    // The first photo of a set becomes its primary. Counted within the set, because each
    // variant has its own primary now -- see image.service.
    const target = uploadTarget;
    const existing = images.filter(i => (i.variantId || null) === (target || null));
    uploadMutation.mutate({ file, isPrimary: existing.length === 0, variantId: target || undefined });
  };

  const setPrimary = (imageId) => {
    updateMutation.mutate({ imageId, data: { isPrimary: true } });
  };

  const handleDelete = (imageId) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete this photo?',
      message: 'It is removed from the product and from storage. There is no undo — you would have to upload it again.',
      confirmText: 'Delete',
      confirmStyle: 'danger',
      onConfirm: () => deleteMutation.mutateAsync(imageId)
    });
  };

  if (isLoading) return <PageLoader text="LOADING IMAGES..." />;

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 }
  };

  /*
   * A flat-lay reference is not a photograph of the product.
   *
   * When Try-On generates a product's views, the picture the merchant uploaded to generate them
   * from is kept as RAW_UPLOAD -- a garment laid flat on a table. The shop deliberately shows only
   * COVER and GALLERY, so a product with four generated views and one reference has five photos
   * here and four online. That is right, and it looked like a bug: nothing on this screen said
   * which was which, so the only way to find out was to count them in two places.
   */
  const isReference = (image) => image.imageType === 'RAW_UPLOAD';

  /** Promote a reference to a real photo, for a merchant who wants it in the shop after all. */
  const showInShop = (imageId) => updateMutation.mutate({ imageId, data: { imageType: 'GALLERY' } });

  const referenceCount = images.filter(i => i.imageType === 'RAW_UPLOAD').length;

  const renderImage = (image) => (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
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
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          // Dimmed, so which ones a customer actually sees is obvious at a glance.
          opacity: isReference(image) ? 0.55 : 1
        }}
      />

      {isReference(image) && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, padding: '7px 8px',
          background: 'linear-gradient(to top, rgba(0,0,0,.78), transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px'
        }}>
          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600, letterSpacing: '.03em' }}
            title="This is the photo Try-On generated the others from. Customers do not see it.">
            NOT IN YOUR SHOP
          </span>
          <button
            onClick={() => showInShop(image.id)}
            disabled={updateMutation.isPending}
            style={{
              color: '#fff', background: 'rgba(255,255,255,.18)', border: 0, cursor: 'pointer',
              padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600
            }}
            title="Show this photo in your online shop too"
          >
            Show it
          </button>
        </div>
      )}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '8px', display: 'flex', justifyContent: 'space-between', gap: '8px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)'
      }}>
        {image.isPrimary ? (
          <span style={{
            background: 'var(--accent-gold)', color: '#000',
            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
            alignSelf: 'center'
          }}>
            PRIMARY
          </span>
        ) : (
          <button
            onClick={() => setPrimary(image.id)}
            disabled={updateMutation.isPending}
            style={{ color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '6px', borderRadius: '4px', display: 'flex' }}
            title="Use this as the main photo"
          >
            <Star size={14} />
          </button>
        )}
        <button
          onClick={() => handleDelete(image.id)}
          disabled={deleteMutation.isPending}
          style={{ color: '#fff', background: 'rgba(239, 68, 68, 0.8)', padding: '6px', borderRadius: '4px', display: 'flex' }}
          title="Delete this photo"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="glass-panel" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Product Images</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {/* The count, not just a list. A shop with twelve colours cannot see at a glance
                which ones are missing by scrolling; this says so in one line. */}
            {variants.length === 0
              ? 'Add sizes and colours first, then each one can have its own photo.'
              : missingCount > 0
                // Two different numbers decide two different words. The NOUN counts the total
                // ("of 2 variants"), the VERB agrees with how many are missing ("1 ... has").
                // Taking both from one of them gives "1 of 2 variants have" or "1 of 2 variant
                // has"; only splitting them reads like English.
                ? `${missingCount} of ${variants.length} ${variants.length === 1 ? 'variant' : 'variants'} ${missingCount === 1 ? 'has' : 'have'} no photo yet.`
                : 'Every size and colour has at least one photo.'}
            {/* Both numbers, in one line, so "five here and four online" is never a mystery. */}
            {referenceCount > 0 && (
              <span style={{ display: 'block', marginTop: '4px' }}>
                {images.length - referenceCount} of these {images.length - referenceCount === 1 ? 'is' : 'are'} shown
                in your online shop. {referenceCount === 1 ? 'The other is a' : `The other ${referenceCount} are`} flat-lay
                {referenceCount === 1 ? ' reference' : ' references'} Try-On generated from.
              </span>
            )}
          </p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {isError ? <LoadFailed what="images" error={error} onRetry={refetch} /> : groups.map(group => (
          <section key={group.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {group.hexCode && (
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: group.hexCode, border: '1px solid var(--border-light)', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {group.title}
                    <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>
                      {group.images.length > 0
                        ? `${group.images.length} ${group.images.length === 1 ? 'photo' : 'photos'}`
                        : 'no photos'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{group.hint}</div>
                </div>
              </div>
              {/* No Add on the loose section: there is nothing left that a photograph of the
                  product as a whole is the right answer to. */}
              {!group.readOnly && (
                <button
                  className="btn-secondary"
                  onClick={() => openPicker(group.variantId)}
                  disabled={uploadMutation.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                >
                  {uploadMutation.isPending && uploadTarget === group.variantId
                    ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                    : <><Upload size={15} /> Add photo</>}
                </button>
              )}
            </div>

            {group.images.length === 0 ? (
              /* Stated, not left blank. An empty row is how a shopkeeper finds the colour
                 whose photo nobody ever took -- before a customer does. */
              <div style={{
                padding: '20px', borderRadius: '8px', border: '1px dashed var(--border-light)',
                display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px'
              }}>
                <ImageOff size={16} />
                No photo of {group.title} yet. A customer choosing it would see another colour.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: '16px' }}>
                <AnimatePresence>{group.images.map(renderImage)}</AnimatePresence>
              </div>
            )}
          </section>
        ))}
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
