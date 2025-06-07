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
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          @page {
            size: 29mm 90mm;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #fff;
            color: #000;
            overflow: hidden;
          }
          .label {
            width: 27mm;
            height: 88mm;
            margin: 1mm;
            padding: 0;
            position: relative;
            box-sizing: border-box;
            border: none;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .dot {
            width: 8px;
            height: 8px;
            background-color: red;
            border-radius: 50%;
            position: absolute;
            z-index: 2;
          }
          .top-left {
            top: 0;
            left: 0;
            transform: translate(-50%, -50%);
          }
          .top-right {
            top: 0;
            right: 0;
            transform: translate(50%, -50%);
          }
          .bottom-left {
            bottom: 0;
            left: 0;
            transform: translate(-50%, 50%);
          }
          .bottom-right {
            bottom: 0;
            right: 0;
            transform: translate(50%, 50%);
          }
          .content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 100%;
            padding: 4mm;
            box-sizing: border-box;
          }
          .qr {
            width: 25mm;
            height: 25mm;
            flex-shrink: 0;
          }
          .qr img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            height: 110mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-start;
            margin: 0 0 0 5mm;
            gap: 4mm;
          }
          .label-title {
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            margin: 0;
            padding: 1mm 0;
          }
          .label-text {
            font-size: 10px;
            white-space: nowrap;
            margin: 0;
            padding: 1mm 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .label-b {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="dot top-left"></div>
          <div class="dot top-right"></div>
          <div class="dot bottom-left"></div>
          <div class="dot bottom-right"></div>
          <div class="content">
            <div class="qr">
              <img src="${qrImageBase64}" width="90" height="90" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2270%22%20height%3D%2270%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2270%22%20height%3D%2270%22%20fill%3D%22%23ccc%22%2F%3E%3Ctext%20x%3D%2235%22%20y%3D%2235%22%20font-family%3D%22Arial%22%20font-size%3D%228%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3EQR%3C%2Ftext%3E%3C%2Fsvg%3E'" />
            </div>
            <div class="text">
              <span class="label-title">Order #: ${orderNumber}</span>
              <span class="label-text"><span class="label-b">Name: ${customerName}</span></span>
              <span class="label-text"><span class="label-b">Garment: ${garmentType}</span></span>
              <span class="label-text"><span class="label-b">Notes: ${notes || 'None'}</span></span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export const printLabel = async (html: string) => {
  try {
    // Convert mm to points (1mm = 2.83465 points)
    const widthMM = 29; // 29mm
    const heightMM = 90; // 90mm
    await Print.printAsync({
      html,
      width: widthMM * 3, // Convert mm to points
      height: heightMM * 3.05, // Convert mm to points
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
      useMarkupFormatter: true
    });
  } catch (error: unknown) {
    console.error('Error printing:', error);
  }
};
