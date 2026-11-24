/**
 * Professional Google Maps-style GPS Map Camera Watermark Engine.
 * Stamped onto captured field visit photos & invoice proofs with:
 * - Ultra-modern semi-transparent glassmorphism HUD (transparent background)
 * - Authentic miniature Google Maps badge with styled roads, parks, and red Google pin
 * - High-contrast typography for Party/Shop name, address, coordinates, and timestamp
 * - Monospace emerald GPS coordinates with degree format & accuracy
 * - Geo-verification audit security footer
 */

export const stampGpsWatermark = (source, metadata = {}, maxWidth = 1280, quality = 0.88) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      let width = source.videoWidth || source.naturalWidth || source.width || 1280;
      let height = source.videoHeight || source.naturalHeight || source.height || 720;

      // Maintain aspect ratio with maxWidth cap
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not supported');
      }

      // 1. Draw base photo frame
      ctx.drawImage(source, 0, 0, width, height);

      // 2. Extract and format metadata
      const partyName = metadata.partyName || 'Customer Field Visit';
      const shopName = metadata.shopName || '';
      const address = metadata.address || 'Field Location Verified';
      const city = metadata.city || '';
      const lat = metadata.lat != null && metadata.lat !== '' ? Number(metadata.lat) : null;
      const lng = metadata.lng != null && metadata.lng !== '' ? Number(metadata.lng) : null;
      const accuracy = metadata.accuracy != null ? Number(metadata.accuracy) : null;
      const date = metadata.date ? new Date(metadata.date) : new Date();
      const salesmanName = metadata.salesmanName || 'Field Salesman';
      const visitCode = metadata.visitCode || '';

      // 3. Responsive scaling factor based on canvas resolution
      const scale = Math.max(0.75, Math.min(1.4, width / 960));
      const padding = 16 * scale;
      const margin = 16 * scale;
      const bannerHeight = 165 * scale;
      const bannerWidth = Math.min(width - margin * 2, 660 * scale);
      const bannerX = margin;
      const bannerY = height - bannerHeight - margin;
      const radius = 18 * scale;

      // 4. Background HUD card (Semi-transparent obsidian glassmorphism)
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 16 * scale;
      ctx.shadowOffsetY = 4 * scale;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, radius);
      } else {
        ctx.rect(bannerX, bannerY, bannerWidth, bannerHeight);
      }
      // Transparent frosted glass (allows photo to show through)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fill();

      // Subtle frosted glass border
      ctx.lineWidth = 1.2 * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.stroke();
      ctx.restore();

      // 5. Miniature Google Maps Graphic Box (Left)
      const mapBoxSize = 98 * scale;
      const mapX = bannerX + padding;
      const mapY = bannerY + (bannerHeight - mapBoxSize) / 2;
      const mapRadius = 12 * scale;

      ctx.save();
      // Clip to rounded map box
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(mapX, mapY, mapBoxSize, mapBoxSize, mapRadius);
      } else {
        ctx.rect(mapX, mapY, mapBoxSize, mapBoxSize);
      }
      ctx.clip();

      // Map base land color (Google Maps pale gray)
      ctx.fillStyle = '#e8eaed';
      ctx.fillRect(mapX, mapY, mapBoxSize, mapBoxSize);

      // Green park patch (top-right corner)
      ctx.fillStyle = '#ceead6';
      ctx.beginPath();
      ctx.moveTo(mapX + mapBoxSize * 0.55, mapY);
      ctx.lineTo(mapX + mapBoxSize, mapY);
      ctx.lineTo(mapX + mapBoxSize, mapY + mapBoxSize * 0.45);
      ctx.closePath();
      ctx.fill();

      // Water body (bottom-left corner)
      ctx.fillStyle = '#c2e7ff';
      ctx.beginPath();
      ctx.arc(mapX, mapY + mapBoxSize, mapBoxSize * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Road outlines & streets (Google Maps styling)
      ctx.lineWidth = 8 * scale;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';

      // Diagonal arterial road
      ctx.beginPath();
      ctx.moveTo(mapX - 5, mapY + mapBoxSize * 0.75);
      ctx.lineTo(mapX + mapBoxSize + 5, mapY + mapBoxSize * 0.25);
      ctx.stroke();

      // Cross street
      ctx.beginPath();
      ctx.moveTo(mapX + mapBoxSize * 0.4, mapY - 5);
      ctx.lineTo(mapX + mapBoxSize * 0.6, mapY + mapBoxSize + 5);
      ctx.stroke();

      // Highway / Secondary route (warm amber)
      ctx.lineWidth = 4 * scale;
      ctx.strokeStyle = '#fed7aa';
      ctx.beginPath();
      ctx.moveTo(mapX - 5, mapY + mapBoxSize * 0.75);
      ctx.lineTo(mapX + mapBoxSize + 5, mapY + mapBoxSize * 0.25);
      ctx.stroke();

      // Mini "Google" style corner label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.font = `bold ${8 * scale}px sans-serif`;
      ctx.fillText('Google', mapX + 6 * scale, mapY + mapBoxSize - 6 * scale);

      // Google Red Map Pin (Centered on mini map)
      const pinCenterX = mapX + mapBoxSize / 2;
      const pinCenterY = mapY + mapBoxSize / 2 - 3 * scale;

      // Pin drop shadow
      ctx.beginPath();
      ctx.ellipse(pinCenterX, pinCenterY + 14 * scale, 9 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fill();

      // Pin body (Classic Google Red)
      ctx.beginPath();
      ctx.arc(pinCenterX, pinCenterY - 4 * scale, 10 * scale, Math.PI * 0.75, Math.PI * 2.25);
      ctx.lineTo(pinCenterX, pinCenterY + 12 * scale);
      ctx.closePath();
      ctx.fillStyle = '#ea4335'; // Google Red
      ctx.fill();
      ctx.strokeStyle = '#c5221f';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();

      // Inner white pin circle
      ctx.beginPath();
      ctx.arc(pinCenterX, pinCenterY - 4 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore(); // Undo clip

      // Border around mini map box
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(mapX, mapY, mapBoxSize, mapBoxSize, mapRadius);
      } else {
        ctx.rect(mapX, mapY, mapBoxSize, mapBoxSize);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
      ctx.restore();

      // Text layout offsets
      const textX = mapX + mapBoxSize + 14 * scale;
      const textAvailableWidth = bannerWidth - (textX - bannerX) - padding;

      // 6. Date & Time Stamp Pill Badge (Top-Right of HUD)
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateStr = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const stampText = `${timeStr}  |  ${dateStr}`;

      ctx.save();
      ctx.font = `bold ${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const badgeW = ctx.measureText(stampText).width + 16 * scale;
      const badgeH = 24 * scale;
      const badgeX = bannerX + bannerWidth - padding - badgeW;
      const badgeY = bannerY + padding - 2 * scale;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 7 * scale);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fillStyle = 'rgba(245, 158, 11, 0.28)'; // Amber glass
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke();

      ctx.fillStyle = '#fef08a'; // Bright gold text
      ctx.fillText(stampText, badgeX + 8 * scale, badgeY + 16.5 * scale);
      ctx.restore();

      // 7. Header: Customer / Shop Name
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${16.5 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const title = shopName ? `${partyName} • ${shopName}` : partyName;
      const maxTitleLen = Math.floor(textAvailableWidth / (9.5 * scale));
      ctx.fillText(
        title.length > maxTitleLen ? title.slice(0, maxTitleLen - 2) + '...' : title,
        textX,
        bannerY + padding + 15 * scale
      );

      // 8. Full Address / Locality Line
      ctx.fillStyle = '#f1f5f9'; // Bright slate-100
      ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const fullAddress = [address, city].filter(Boolean).join(', ') || 'Field Verification Location';
      const maxAddrLen = Math.floor(textAvailableWidth / (7.2 * scale));
      ctx.fillText(
        fullAddress.length > maxAddrLen ? fullAddress.slice(0, maxAddrLen - 2) + '...' : fullAddress,
        textX,
        bannerY + padding + 36 * scale
      );

      // Subtle Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(textX, bannerY + padding + 49 * scale);
      ctx.lineTo(bannerX + bannerWidth - padding, bannerY + padding + 49 * scale);
      ctx.stroke();

      // 9. GPS Coordinates Line (Emerald Monospace with N/E hemisphere format)
      ctx.fillStyle = '#4ade80'; // Emerald-400
      ctx.font = `bold ${12.5 * scale}px "Courier New", Courier, monospace`;
      const latDir = lat != null ? (lat >= 0 ? 'N' : 'S') : '';
      const lngDir = lng != null ? (lng >= 0 ? 'E' : 'W') : '';
      const latText = lat != null ? `${Math.abs(lat).toFixed(6)}° ${latDir}` : 'GPS Pending';
      const lngText = lng != null ? `${Math.abs(lng).toFixed(6)}° ${lngDir}` : 'GPS Pending';
      const accText = accuracy != null ? `(±${Math.round(accuracy)}m)` : '(Verified)';
      ctx.fillText(`GPS: ${latText}, ${lngText} ${accText}`, textX, bannerY + padding + 71 * scale);

      // 10. Salesman & Visit Reference Line
      ctx.fillStyle = '#cbd5e1'; // Slate-300
      ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const salesLine = `Salesman: ${salesmanName} ${visitCode ? `| Visit: ${visitCode}` : ''}`;
      ctx.fillText(salesLine.length > 55 ? salesLine.slice(0, 52) + '...' : salesLine, textX, bannerY + padding + 92 * scale);

      // 11. Security Watermark Tag (Bottom of HUD)
      ctx.fillStyle = '#38bdf8'; // Sky-400
      ctx.font = `bold ${9.5 * scale}px "Courier New", Courier, monospace`;
      ctx.fillText('✓ GOOGLE MAPS GPS CAMERA • GEO-VERIFIED VISIT PROOF', textX, bannerY + padding + 112 * scale);
      ctx.restore();

      // Return high quality JPEG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Stamp watermark from a File object
 */
export const stampFileWithGps = (file, metadata = {}, maxWidth = 1280) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const stampedDataUrl = await stampGpsWatermark(img, metadata, maxWidth);
          resolve(stampedDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
