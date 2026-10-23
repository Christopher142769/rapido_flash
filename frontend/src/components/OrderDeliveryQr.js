import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './OrderDeliveryQr.css';

/** QR de livraison du récapitulatif : le livreur le scanne à la remise pour clôturer la livraison. */
export default function OrderDeliveryQr({ value, orderNumber }) {
  const wrapRef = useRef(null);
  if (!value) return null;

  const download = () => {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pad = 32;
    const out = document.createElement('canvas');
    out.width = canvas.width + pad * 2;
    out.height = canvas.height + pad * 2 + 40;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, pad, pad);
    ctx.fillStyle = '#381808';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Rapido · Commande ${orderNumber || ''}`.trim(), out.width / 2, out.height - 18);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `qr-livraison-${orderNumber || 'commande'}.png`;
    a.click();
  };

  return (
    <section className="odq" aria-label="QR de livraison">
      <h3>Votre QR de livraison</h3>
      <p>Présentez-le au livreur à la remise de votre commande : il le scanne pour confirmer la livraison.</p>
      <div className="odq-box" ref={wrapRef}>
        <QRCodeCanvas value={value} size={200} level="M" includeMargin />
      </div>
      <button type="button" className="odq-btn" onClick={download}>Télécharger mon QR</button>
    </section>
  );
}
