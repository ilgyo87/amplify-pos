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
        <meta name="viewport" content="width=29mm, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          @page {
            size: 29mm 90mm;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 29mm;
            height: 90mm;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #fff;
            color: #000;
            overflow: hidden;
          }
          .label {
            width: 29mm;
            height: 90mm;
            margin: 0;
            padding: 1mm;
            box-sizing: border-box;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
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
            margin: 2mm 0;
            padding: 1mm;
            display: flex;
            justify-content: center;
            align-items: center;
            background: white;
          }
          .qr img {
            max-width: 100%;
            max-height: 100%;
            display: block;
          }
          .text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            height: 50mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-start;
            margin: 2mm 0;
            font-size: 10px;
            gap: 2mm;
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
              <img src="${qrImageBase64}" alt="QR Code" style="width: 25mm; height: 25mm;" />
            </div>
            <div class="text">
              <span>Order #: ${orderNumber}</span>
              <span>Name: ${customerName}</span>
              <span>Garment: ${garmentType}</span>
              <span>Notes: ${notes || 'None'}</span>
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
      height: heightMM * 3.02, // Convert mm to points
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
      useMarkupFormatter: true
    });
  } catch (error: unknown) {
    console.log('Error printing:', error);
  }
};
