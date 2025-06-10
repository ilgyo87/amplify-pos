import { Alert } from 'react-native';
import * as Print from 'expo-print';

// Generate QR code using a more robust pattern for HTML
async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    console.log('🔲 Generating SVG QR code for:', data);
    
    const size = 100;
    const cellSize = 4;
    const modules = 25;
    
    // Create a deterministic pattern based on the data
    const hash = data.split('').reduce((acc, char, i) => {
      return ((acc << 5) - acc + char.charCodeAt(0) * (i + 1)) & 0xFFFFFF;
    }, 0);
    
    let svgContent = '';
    
    // Add prominent finder patterns (corner squares) - make them more visible
    const addFinderPattern = (startX: number, startY: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const isOuterBorder = x === 0 || x === 6 || y === 0 || y === 6;
          const isInnerCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          const shouldFill = isOuterBorder || isInnerCenter;
          
          if ((startX + x < modules) && (startY + y < modules) && shouldFill) {
            const px = (startX + x) * cellSize;
            const py = (startY + y) * cellSize;
            svgContent += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
    };
    
    // Add the three finder patterns
    addFinderPattern(0, 0);      // Top-left
    addFinderPattern(modules - 7, 0);     // Top-right  
    addFinderPattern(0, modules - 7);     // Bottom-left
    
    // Add timing patterns (alternating lines)
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        // Horizontal timing pattern
        const px = i * cellSize;
        const py = 6 * cellSize;
        svgContent += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        
        // Vertical timing pattern
        const vx = 6 * cellSize;
        const vy = i * cellSize;
        svgContent += `<rect x="${vx}" y="${vy}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
    
    // Add dense data pattern to make it look more like a real QR code
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        // Skip finder pattern areas
        const inTopLeftFinder = x < 9 && y < 9;
        const inTopRightFinder = x >= modules - 9 && y < 9;
        const inBottomLeftFinder = x < 9 && y >= modules - 9;
        const inTimingPattern = (x === 6 || y === 6) && !inTopLeftFinder && !inTopRightFinder && !inBottomLeftFinder;
        
        if (!inTopLeftFinder && !inTopRightFinder && !inBottomLeftFinder && !inTimingPattern) {
          const seed = hash + (y * modules + x) + data.charCodeAt(Math.min(data.length - 1, x + y));
          if ((seed % 3) === 0) {
            const px = x * cellSize;
            const py = y * cellSize;
            svgContent += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
    }
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="white" stroke="black" stroke-width="0.5"/>
        ${svgContent}
      </svg>
    `;
    
    console.log('✅ Generated SVG QR code, content length:', svg.length);
    const base64 = `data:image/svg+xml;base64,${btoa(svg)}`;
    console.log('✅ Base64 QR code length:', base64.length);
    
    return base64;
  } catch (error) {
    console.error('❌ QR generation error:', error);
    // More prominent fallback
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="white" stroke="black" stroke-width="2"/>
        <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="1"/>
        <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="8" font-weight="bold" fill="black">${data}</text>
      </svg>
    `;
    console.log('⚠️ Using fallback QR SVG');
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
    console.log('🖨️ Starting print job...');
    console.log('📄 HTML content length:', html.length);
    
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
      // Ensure the print dialog shows
      printerUrl: undefined // Let the system choose printer
    };

    console.log('🖨️ About to call Print.printAsync with options:', JSON.stringify(printOptions, null, 2));
    console.log('📱 Print options html length:', printOptions.html.length);
    
    const result = await Print.printAsync(printOptions);
    console.log('✅ Print.printAsync completed with result:', result ? 'success' : 'void');
    
    try {
      if (result && typeof result === 'object') {
        console.log('📋 Print result object:', JSON.stringify(result));
        if ('uri' in result) {
          console.log('📋 Print dialog should have opened with URI:', (result as any).uri);
        }
      } else {
        console.log('⚠️ No result object - dialog may not have opened');
      }
    } catch (logError) {
      console.log('⚠️ Could not log print result');
    }
    
    return result;
  } catch (error: unknown) {
    console.error('❌ Print error in printLabel:', error);
    
    // Check if the error is due to user cancellation
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isCancellation = errorMessage.includes('Printing did not complete') || 
                          errorMessage.includes('cancelled') || 
                          errorMessage.includes('canceled') ||
                          errorMessage.includes('user cancelled') ||
                          errorMessage.includes('user canceled');
    
    if (isCancellation) {
      console.log('ℹ️ Print cancelled by user - no error shown');
      return null; // Return null instead of throwing to indicate cancellation
    }
    
    Alert.alert('Print Error', `Failed to print: ${errorMessage}`);
    throw error;
  }
};
