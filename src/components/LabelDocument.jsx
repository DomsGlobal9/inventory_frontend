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
    marginBottom: 2,
  },
  title: {
    fontSize: 6,
    fontWeight: 'bold',
    maxWidth: '65%',
    textOverflow: 'ellipsis',
    maxLines: 1,
  },
  price: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  sku: {
    fontSize: 5,
    marginBottom: 4,
    color: '#333333',
    width: '100%',
    textAlign: 'left'
  },
  barcodeImage: {
    width: '90%',
    height: 25,
    marginBottom: 2,
  },
  barcodeText: {
    fontSize: 5,
    letterSpacing: 1,
    fontFamily: 'Courier',
  }
});

// Create Document Component
export const LabelDocument = ({ variants, productName, clientId, locationId }) => {
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
