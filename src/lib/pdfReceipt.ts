import jsPDF from 'jspdf';
import QRCode from 'react-qr-code';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { type Booking, type HallSettings, HALL_LABELS, getSlotTimes, formatHour, getCachedSettings } from './bookingStore';

function svgToDataUrl(svgMarkup: string): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

export async function downloadBookingPDF(booking: Booking, verificationUrl?: string) {
  const settings = getCachedSettings();
  const societyName = settings.societyName || 'Ashar 16 CHSL';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Header bar
  doc.setFillColor(30, 55, 90);
  doc.rect(0, 0, w, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(societyName, margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Community Hall Booking Confirmation', margin, y);
  y = 52;

  // Booking ID strip
  doc.setFillColor(240, 243, 248);
  doc.rect(margin, y, w - margin * 2, 14, 'F');
  doc.setTextColor(30, 55, 90);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Booking ID: ${booking.id}`, margin + 5, y + 9);
  y += 24;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const slots = getSlotTimes();
  const slotLabel = booking.timeSlot === 'custom'
    ? `Custom (${formatHour(booking.customStartHour!)} – ${formatHour(booking.customEndHour!)})`
    : slots[booking.timeSlot as keyof typeof slots]?.label || booking.timeSlot;

  const hallLabel = HALL_LABELS[booking.hall] || booking.hall;

  const rows: [string, string][] = [
    ['Date', formattedDate],
    ['Hall', hallLabel],
    ['Time Slot', slotLabel],
    ['Flat Number', booking.flatNumber],
    ['Booked By', booking.name],
    ['Phone', booking.phone || '—'],
    ['Event Type', booking.eventType],
    ['Attendees', String(booking.memberCount)],
    ['User Type', booking.userType.charAt(0).toUpperCase() + booking.userType.slice(1)],
    ['Booking Type', booking.bookingType === 'manual' ? 'Manual (Admin)' : 'Online'],
  ];

  // Add custom data fields
  if (booking.customData) {
    const customFields = settings.customFields || [];
    customFields.forEach(field => {
      const val = booking.customData?.[field.id];
      if (val) rows.push([field.label, val]);
    });
  }

  const colX = margin;
  const valX = margin + 50;

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, colX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value, valX, y);
    y += 8;
  });

  y += 4;

  // Payment summary box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, w - margin * 2, 36, 3, 3, 'F');
  doc.setDrawColor(200, 210, 225);
  doc.roundedRect(margin, y, w - margin * 2, 36, 3, 3, 'S');
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 55, 90);
  doc.setFontSize(11);
  doc.text('Payment Summary', margin + 5, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Hall Rent', margin + 5, y);
  doc.text(`₹${booking.rent.toLocaleString('en-IN')}`, w - margin - 5, y, { align: 'right' });
  y += 7;
  doc.text('Security Deposit', margin + 5, y);
  doc.text(`₹${booking.deposit.toLocaleString('en-IN')}`, w - margin - 5, y, { align: 'right' });
  y += 7;
  doc.setDrawColor(180, 190, 200);
  doc.line(margin + 5, y - 2, w - margin - 5, y - 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 55, 90);
  doc.text('Total Paid', margin + 5, y + 2);
  doc.text(`₹${booking.total.toLocaleString('en-IN')}`, w - margin - 5, y + 2, { align: 'right' });

  y += 20;

  if (verificationUrl) {
    // Render QR code as image
    const svgMarkup = renderToStaticMarkup(createElement(QRCode, { value: verificationUrl, size: 200 }));
    const qrDataUrl = await svgToDataUrl(svgMarkup);

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, w - margin * 2, 60, 3, 3, 'F');
    doc.setDrawColor(200, 210, 225);
    doc.roundedRect(margin, y, w - margin * 2, 60, 3, 3, 'S');
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 55, 90);
    doc.setFontSize(10);
    doc.text('Verification QR Code', margin + 5, y);

    // Embed QR image
    doc.addImage(qrDataUrl, 'PNG', w - margin - 45, y - 4, 40, 40);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(`Scan for payment verification`, margin + 5, y);
    y += 5;
    doc.text(`Booking ID: ${booking.id}`, margin + 5, y);
    y += 5;
    doc.text(`URL: ${verificationUrl}`, margin + 5, y);
    y += 40;
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'italic');
  doc.text('Please show this receipt or your QR code to the security guard on the day of the event.', margin, y);
  y += 6;
  doc.text('For any queries, contact the society office.', margin, y);

  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.setFont('helvetica', 'normal');
  doc.text(`${societyName} – Community Hall Booking System`, w / 2, footerY, { align: 'center' });

  doc.save(`Booking_${booking.id}.pdf`);
}
