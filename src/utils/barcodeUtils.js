import JsBarcode from 'jsbarcode';

export const generateBarcodeDataUrl = (value) => {
  if (!value) return null;
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: false, // We will render text explicitly in the PDF
    margin: 0,
    width: 2,
    height: 40
  });
  return canvas.toDataURL('image/png');
};
