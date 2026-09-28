import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { generateBarcodeDataUrl } from '../utils/barcodeUtils';
import { resolveVariantPrice, formatRupeesForPrint } from '../utils/priceUtils';

// Register standard fonts if needed, or use default Helvetica
Font.register({
  family: 'Open Sans',
  src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    // 50mm x 25mm is roughly 141.73 x 70.86 points (1mm = 2.8346 points)
    width: 141.73,
    height: 70.86,
    padding: 4,
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Helvetica',
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 1,
  },
  title: {
    fontSize: 6,
    fontWeight: 'bold',
    maxWidth: '65%',
    textOverflow: 'ellipsis',
    maxLines: 1,
  },
  /*
   * The shop's mark, small, at the head of the label.
   *
   * Nothing like the swing tag's, deliberately. A swing tag is 85mm of the shop's own object and
   * can carry a logo that reads across a counter. This is a 25mm sticker whose entire job is to
   * be scanned, and the barcode needs every millimetre it has. So the logo sits in the header row
   * beside the name: present and identifying, not competing with the thing that has to work.
   *
   * Both dimensions capped with objectFit contain, because a logo is usually a wordmark and
   * constraining only the height would let one push the price off a 50mm label.
   */
  logoRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 1,
  },
  logo: {
    height: 9,
    maxWidth: '55%',
    objectFit: 'contain',
  },
  price: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  sku: {
    fontSize: 5,
    marginBottom: 2,
    color: '#333333',
    width: '100%',
    textAlign: 'left'
  },
  barcodeImage: {
    width: '90%',
    height: 23,
    marginBottom: 1,
  },
  barcodeText: {
    fontSize: 5,
    letterSpacing: 1,
    fontFamily: 'Courier',
  }
});

// Create Document Component
/**
 * logoDataUrl is a DATA url, never a remote one, and that is not fussiness.
 *
 * react-pdf fetches a remote image while rendering, and a fetch that fails -- offline, CORS, a
 * logo deleted from storage -- rejects the whole render. Labels would stop printing because of a
 * picture nobody needs, and a shop that cannot ticket its stock cannot put it on the shelf. The
 * caller resolves the logo to a data url first and passes null if that did not work, so the worst
 * case is a label without a logo rather than no label at all.
 */
export const LabelDocument = ({ variants, productName, clientId, locationId, logoDataUrl }) => {
  return (
    <Document
      title={`Labels_${productName || 'Variants'}.pdf`}
      creator="ScaleEzy API Gateway"
      subject={JSON.stringify({ clientId: clientId || 'unknown', generatedAt: new Date().toISOString() })} // Metadata requested by user
    >
      {variants.map((variant) => {
        // Was: `variant.priceOverride || variant.product?.basePrice || 'N/A'`.
        // Both operands were always undefined -- `priceOverride` lives on
        // VariantLocationProfile, not on ProductVariant, and `product` wasn't included in
        // the variants payload -- so EVERY label printed "Rs.N/A". It also never looked at
        // sellingPrice, which is the field the Variants pricing UI actually writes.
        const price = formatRupeesForPrint(resolveVariantPrice(variant, locationId));
        return (
        <Page key={variant.id} size={[141.73, 70.86]} style={styles.page}>
          
          {/* The shop's mark, on its own line across the top. */}
          {logoDataUrl ? (
            <View style={styles.logoRow}>
              <Image style={styles.logo} src={logoDataUrl} />
            </View>
          ) : null}

          {/* Header: Title and Price */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>{productName}</Text>
            <Text style={styles.price}>{price || 'No price'}</Text>
          </View>
          
          {/* Subheader: SKU */}
          <Text style={styles.sku}>SKU: {variant.sku}</Text>
          
          {/* Barcode Image */}
          <Image 
            style={styles.barcodeImage} 
            src={generateBarcodeDataUrl(variant.barcode)} 
          />
          
          {/* Barcode Value */}
          <Text style={styles.barcodeText}>{variant.barcode}</Text>
          
        </Page>
        );
      })}
    </Document>
  );
};
