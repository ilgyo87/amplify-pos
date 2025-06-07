import { Alert } from 'react-native';
import * as Print from 'expo-print';

export async function generateLabelHTML({
  orderNumber,
  customerName,
  garmentType,
  notes,
  qrImageBase64
}: {
  orderNumber: string,
  customerName: string,
  garmentType: string,
  notes: string,
  qrImageBase64: string
}): Promise<string> {
  return `
    <div class="qr-container">
      <img src="${qrImageBase64}" alt="QR Code" onerror="console.error('Failed to load QR code')" />
    </div>
    <div class="order-info">
      <div class="order-number">Order #: ${orderNumber}</div>
      <div>Name: ${customerName}</div>
      <div>Garment: ${garmentType}</div>
      <div>Notes: ${notes || 'None'}</div>
    </div>`;
}

export const printLabel = async (html: string) => {
  try {
    console.log('Starting print job...');
    
    // Create a temporary HTML file with the content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              size: 29mm 90mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 2mm;
              width: 27mm;
              height: 88mm;
              font-family: Arial, sans-serif;
              font-size: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
            }
            .qr-container {
              width: 25mm;
              height: 25mm;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 2mm 0;
            }
            .qr-container img {
              max-width: 100%;
              max-height: 100%;
              display: block;
            }
            .order-info {
              writing-mode: vertical-rl;
              text-orientation: mixed;
              transform: rotate(180deg);
              margin: 0;
              padding: 0;
              height: 50mm;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: flex-start;
              gap: 4mm;
            }
            .order-info div {
              margin: 0;
              padding: 0;
              white-space: nowrap;
            }
            .order-number {
              font-weight: bold;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Print the HTML content
    const printOptions = {
      html: printContent,
      width: 29 * 2.83465, // 29mm in points
      height: 90 * 2.83465, // 90mm in points
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
      useWebView: true, // Use WebView for better HTML rendering
    };

    const result = await Print.printAsync(printOptions);
    console.log('Print result:', result);
    return result;
  } catch (error: unknown) {
    console.log(error);
  }
};
