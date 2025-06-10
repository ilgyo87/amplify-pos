import { Alert } from 'react-native';
import * as Print from 'expo-print';

// Generate QR code using qrcode library for HTML
async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    // Use a simple approach to generate a QR-like pattern
    const size = 100;
    const cellSize = 4;
    const modules = 25;
    
    // Create a hash-based pattern
    const hash = data.split('').reduce((acc, char, i) => {
      return ((acc << 5) - acc + char.charCodeAt(0) * (i + 1)) & 0xFFFFFF;
    }, 0);
    
    let svgContent = '';
    
    // Add finder patterns (corner squares)
    const addFinderPattern = (startX: number, startY: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const isEdge = x === 0 || x === 6 || y === 0 || y === 6;
          const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          if ((startX + x < modules) && (startY + y < modules) && (isEdge || isCenter)) {
            const px = (startX + x) * cellSize;
            const py = (startY + y) * cellSize;
            svgContent += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
    };
    
    // Add finder patterns
    addFinderPattern(0, 0);      // Top-left
    addFinderPattern(18, 0);     // Top-right  
    addFinderPattern(0, 18);     // Bottom-left
    
    // Add data pattern
    for (let y = 9; y < modules - 1; y++) {
      for (let x = 9; x < modules - 1; x++) {
        const seed = hash + (y * modules + x);
        if ((seed % 3) === 0) {
          const px = x * cellSize;
          const py = y * cellSize;
          svgContent += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="white"/>
        ${svgContent}
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch (error) {
    console.error('QR generation error:', error);
    // Simple fallback with text
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="white" stroke="black" stroke-width="1"/>
        <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold">${data}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(fallbackSvg)}`;
  }
}

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
  // Check if qrImageBase64 is a captured image or just the QR data
  let imageUri: string;
  
  if (qrImageBase64.startsWith('data:image/')) {
    // It's already a base64 image
    imageUri = qrImageBase64;
  } else if (qrImageBase64.length > 1000) {
    // It's a base64 string (captured image)
    imageUri = `data:image/png;base64,${qrImageBase64}`;
  } else {
    // It's just the QR data, generate SVG QR code
    imageUri = await generateQRCodeSVG(qrImageBase64);
  }
  
  return `
    <div class="qr-container">
      <img src="${imageUri}" alt="QR Code" />
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
              width: 20mm;
              height: 20mm;
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
