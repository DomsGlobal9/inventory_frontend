import { pdf } from '@react-pdf/renderer';

/**
 * Build a PDF when it is asked for, and hand it to the browser as a download.
 *
 * On demand rather than through PDFDownloadLink, which renders the whole document on every
 * render of the page around it -- and here the document needs the logo, which has to be fetched
 * and converted before the first byte can be drawn.
 */
export async function downloadPdf(document, fileName) {
  const blob = await makePdf(document);
  const url = URL.createObjectURL(blob);
  try {
    const link = window.document.createElement('a');
    link.href = url;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Revoked a moment later: some browsers start the download after click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return blob;
}

/** The same PDF, as a Blob, without downloading it: what Send on WhatsApp uploads. */
export async function makePdf(document) {
  return pdf(document).toBlob();
}
