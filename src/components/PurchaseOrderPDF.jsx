import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 20
  },
  headerLeft: {
    flexDirection: 'column'
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8
  },
  poNumber: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  businessInfo: {
    marginTop: 20
  },
  businessName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4
  },
  supplierBox: {
    marginTop: 20,
    backgroundColor: '#fafafa',
    padding: 15,
    borderRadius: 4
  },
  supplierTitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  supplierName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4
  },
  table: {
    display: 'table',
    width: 'auto',
    marginTop: 30,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#eee',
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row'
  },
  tableHeader: {
    backgroundColor: '#fafafa',
    fontWeight: 'bold'
  },
  tableColSku: {
    width: '40%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#eee',
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableColQty: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#eee',
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableColPrice: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#eee',
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableColTotal: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#eee',
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableCell: {
    margin: 8,
    fontSize: 9
  },
  summary: {
    marginTop: 20,
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 150,
    marginBottom: 4
  },
  summaryLabel: {
    color: '#666'
  },
  summaryValue: {
    fontWeight: 'bold'
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 150,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  summaryTotalValue: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10
  }
});

const PurchaseOrderPDF = ({ order }) => {
  if (!order) return null;

  const supplier = order.supplier || {};
  const items = order.items || [];
  const totalAmount = order.totalAmount || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>PURCHASE ORDER</Text>
            <Text style={styles.poNumber}>{order.poNumber}</Text>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>ScaleEzy Boutiques Ltd.</Text>
              <Text>123 Commerce Way</Text>
              <Text>Warehouse District, TX 75001</Text>
              <Text>procurement@scaleezy.com</Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <Text>Date: {new Date(order.createdAt).toLocaleDateString()}</Text>
            <Text>Status: {order.status}</Text>
            {order.expectedDeliveryDate && (
              <Text>Expected By: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</Text>
            )}
          </View>
        </View>

        <View style={styles.supplierBox}>
          <Text style={styles.supplierTitle}>Vendor / Supplier</Text>
          <Text style={styles.supplierName}>{supplier.name}</Text>
          {supplier.address && <Text>{supplier.address}</Text>}
          {supplier.email && <Text>{supplier.email}</Text>}
          {supplier.phone && <Text>{supplier.phone}</Text>}
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColSku}><Text style={styles.tableCell}>Item (SKU / Code)</Text></View>
            <View style={styles.tableColQty}><Text style={styles.tableCell}>Ordered Qty</Text></View>
            <View style={styles.tableColPrice}><Text style={styles.tableCell}>Unit Price</Text></View>
            <View style={styles.tableColTotal}><Text style={styles.tableCell}>Line Total</Text></View>
          </View>
          
          {items.map((item, index) => {
            const qty = item.orderedQty || 0;
            const price = Number(item.unitPrice) || 0;
            const lineTotal = qty * price;
            
            return (
              <View style={styles.tableRow} key={index}>
                <View style={styles.tableColSku}>
                  <Text style={styles.tableCell}>{item.sku}</Text>
                  {item.variantCode && <Text style={{ ...styles.tableCell, color: '#666', marginTop: 0 }}>{item.variantCode}</Text>}
                </View>
                <View style={styles.tableColQty}>
                  <Text style={styles.tableCell}>{qty}</Text>
                </View>
                <View style={styles.tableColPrice}>
                  <Text style={styles.tableCell}>Rs. {price.toLocaleString()}</Text>
                </View>
                <View style={styles.tableColTotal}>
                  <Text style={styles.tableCell}>Rs. {lineTotal.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>PO Subtotal:</Text>
            <Text style={styles.summaryTotalValue}>Rs. {Number(totalAmount).toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated document. For queries, please contact procurement@scaleezy.com
        </Text>
        
      </Page>
    </Document>
  );
};

export default PurchaseOrderPDF;
