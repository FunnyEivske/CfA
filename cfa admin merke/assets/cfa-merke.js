/* Cosplay for Alle – felles merkeregler og tegnehjelpere for verktøyene.
   Alle tall er hentet fra merkehåndboken v1.0 (6.10.2026). */
(function (global) {
  'use strict';

  var FARGE = {
    vinrod: '#6D0C32',
    stalgra: '#909090',
    gull: '#F3B716',
    tekst: '#222222',
    lysgra: '#F2F2F2',
    hvit: '#FFFFFF'
  };
  var FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

  // Logoen: 1870 × 2544 → H = 1,36 × B. Frihetssone x = B ÷ 4.
  var LOGO_FORHOLD = 1870 / 2544;
  function logoBredde(h) { return h * LOGO_FORHOLD; }
  function frisone(h) { return logoBredde(h) / 4; }

  function lastBilde(src) {
    return new Promise(function (ok, feil) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { ok(img); };
      img.onerror = function () { feil(new Error('Fant ikke bildet: ' + src)); };
      img.src = src;
    });
  }

  // Finn stien til assets-mappen ut fra der dette skriptet ligger.
  var skript = document.currentScript;
  var ASSETS = skript ? skript.src.replace(/[^\/]*$/, '') : 'assets/';
  var logoPromise = lastBilde(ASSETS + 'logo-farge.svg');

  /** Tegn logoen med øvre venstre hjørne i (x, y) og høyde h. */
  function tegnLogo(ctx, logo, x, y, h) {
    ctx.drawImage(logo, x, y, logoBredde(h), h);
  }

  /** Hvit plate rundt logoen, minst x luft (side 7). Returnerer plateboksen. */
  function tegnPlate(ctx, x, y, h, luft) {
    var b = logoBredde(h);
    var p = luft == null ? frisone(h) : luft;
    var r = Math.max(2, p * 0.35);
    ctx.save();
    ctx.fillStyle = FARGE.hvit;
    rundRekt(ctx, x - p, y - p, b + 2 * p, h + 2 * p, r);
    ctx.fill();
    ctx.restore();
    return { x: x - p, y: y - p, w: b + 2 * p, h: h + 2 * p };
  }

  /**
   * Liggende logo med navn (side 7): avstand x = B/4, navn 0,35 × H Arial Bold vinrød,
   * midtstilt i høyden. Undertekst (slagord eller lokallag) 0,45 × navnets størrelse, #222.
   * Returnerer total bredde.
   */
  function tegnLogoMedNavn(ctx, logo, x, y, h, undertekst, opts) {
    opts = opts || {};
    var b = logoBredde(h);
    var gap = b / 4;
    var navnPx = 0.35 * h;
    var underPx = 0.45 * navnPx;
    tegnLogo(ctx, logo, x, y, h);
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 ' + navnPx + 'px ' + FONT;
    ctx.fillStyle = opts.navnFarge || FARGE.vinrod;
    var tx = x + b + gap;
    var capNavn = navnPx * 0.716;
    var navnBredde = ctx.measureText('Cosplay for Alle').width;
    var underBredde = 0;
    if (undertekst) {
      var luftMellom = navnPx * 0.42; // descender + ca. 1,8 mm luft, som i håndboken
      var capUnder = underPx * 0.716;
      var blokk = capNavn + luftMellom + capUnder;
      var top = y + (h - blokk) / 2;
      ctx.fillText('Cosplay for Alle', tx, top + capNavn);
      ctx.font = '400 ' + underPx + 'px ' + FONT;
      ctx.fillStyle = opts.underFarge || FARGE.tekst;
      ctx.fillText(undertekst, tx, top + capNavn + luftMellom + capUnder);
      underBredde = ctx.measureText(undertekst).width;
    } else {
      ctx.fillText('Cosplay for Alle', tx, y + h / 2 + capNavn / 2);
    }
    ctx.restore();
    return b + gap + Math.max(navnBredde, underBredde);
  }

  function rundRekt(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Tegn et bilde eller en video «cover» i boksen, med fokuspunkt fx/fy (0–1). */
  function tegnDekk(ctx, kilde, x, y, w, h, fx, fy) {
    var sw = kilde.videoWidth || kilde.naturalWidth || kilde.width;
    var sh = kilde.videoHeight || kilde.naturalHeight || kilde.height;
    if (!sw || !sh) return;
    var s = Math.max(w / sw, h / sh);
    var cw = w / s, ch = h / s;
    var cx = (sw - cw) * (fx == null ? 0.5 : fx);
    var cy = (sh - ch) * (fy == null ? 0.5 : fy);
    ctx.drawImage(kilde, cx, cy, cw, ch, x, y, w, h);
  }

  /** Tegn hele kilden synlig i boksen (letterbox) på gitt bakgrunn. */
  function tegnTilpass(ctx, kilde, x, y, w, h, bak) {
    var sw = kilde.videoWidth || kilde.naturalWidth || kilde.width;
    var sh = kilde.videoHeight || kilde.naturalHeight || kilde.height;
    if (!sw || !sh) return;
    ctx.fillStyle = bak || '#111';
    ctx.fillRect(x, y, w, h);
    var s = Math.min(w / sw, h / sh);
    var dw = sw * s, dh = sh * s;
    ctx.drawImage(kilde, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  /** Bryt tekst i linjer som passer bredden. Respekterer linjeskift. */
  function brytTekst(ctx, tekst, maks) {
    var ut = [];
    String(tekst || '').split('\n').forEach(function (avsnitt) {
      var ord = avsnitt.split(/\s+/).filter(Boolean);
      if (!ord.length) { ut.push(''); return; }
      var linje = ord[0];
      for (var i = 1; i < ord.length; i++) {
        var prov = linje + ' ' + ord[i];
        if (ctx.measureText(prov).width <= maks) linje = prov;
        else { ut.push(linje); linje = ord[i]; }
      }
      ut.push(linje);
    });
    return ut;
  }

  /** Lysstyrke (0–1) og uro (standardavvik) i et område av et lerret. */
  function analyserOmrade(ctx, x, y, w, h) {
    x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    var data;
    try { data = ctx.getImageData(x, y, w, h).data; } catch (e) { return null; }
    var n = 0, sum = 0, sum2 = 0, kant = 0, steg = 4 * Math.max(1, Math.floor((w * h) / 4000));
    var forrige = null;
    for (var i = 0; i < data.length; i += steg) {
      var l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      sum += l; sum2 += l * l; n++;
      if (forrige !== null) kant += Math.abs(l - forrige);
      forrige = l;
    }
    var snitt = sum / n;
    return { lys: snitt, uro: Math.sqrt(Math.max(0, sum2 / n - snitt * snitt)), kant: kant / n };
  }

  function lastNed(blob, filnavn) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filnavn;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function lerretTilBlob(canvas, type, kvalitet) {
    return new Promise(function (ok, feil) {
      canvas.toBlob(function (b) { b ? ok(b) : feil(new Error('Kunne ikke lage fil')); }, type, kvalitet);
    });
  }

  /**
   * Lag en PDF der hver side er ett JPEG-bilde som fyller siden.
   * sider: [{ jpeg: Uint8Array, pxB, pxH, mmB, mmH }]. Ingen eksterne biblioteker.
   */
  function lagPdfSider(sider) {
    var enc = new TextEncoder();
    var deler = [], offsets = [], lengde = 0;
    function legg(d) { var b = typeof d === 'string' ? enc.encode(d) : d; deler.push(b); lengde += b.length; }
    function obj(n, innhold) { offsets[n] = lengde; legg(n + ' 0 obj\n'); innhold(); legg('\nendobj\n'); }
    var n = sider.length;
    // objekter: 1 katalog, 2 sider, så per side: side, bilde, innhold
    legg('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, function () { legg('<< /Type /Catalog /Pages 2 0 R >>'); });
    var kids = [];
    for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(2, function () { legg('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>'); });
    sider.forEach(function (sd, i) {
      var o = 3 + i * 3;
      var ptB = (sd.mmB / 25.4 * 72).toFixed(2), ptH = (sd.mmH / 25.4 * 72).toFixed(2);
      obj(o, function () {
        legg('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + ptB + ' ' + ptH + '] ' +
          '/Resources << /XObject << /Im0 ' + (o + 1) + ' 0 R >> >> /Contents ' + (o + 2) + ' 0 R >>');
      });
      obj(o + 1, function () {
        legg('<< /Type /XObject /Subtype /Image /Width ' + sd.pxB + ' /Height ' + sd.pxH +
          ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + sd.jpeg.length + ' >>\nstream\n');
        legg(sd.jpeg);
        legg('\nendstream');
      });
      var innhold = 'q ' + ptB + ' 0 0 ' + ptH + ' 0 0 cm /Im0 Do Q';
      obj(o + 2, function () { legg('<< /Length ' + innhold.length + ' >>\nstream\n' + innhold + '\nendstream'); });
    });
    var antall = 3 + n * 3;
    var xref = lengde;
    var x = 'xref\n0 ' + antall + '\n0000000000 65535 f \n';
    for (var k = 1; k < antall; k++) x += String(offsets[k]).padStart(10, '0') + ' 00000 n \n';
    legg(x);
    legg('trailer\n<< /Size ' + antall + ' /Root 1 0 R /Info << /Producer (Cosplay for Alle merkeverktoy) >> >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(deler, { type: 'application/pdf' });
  }
  function lagPdf(jpegBytes, pxB, pxH, mmB, mmH) {
    return lagPdfSider([{ jpeg: jpegBytes, pxB: pxB, pxH: pxH, mmB: mmB, mmH: mmH }]);
  }

  /** Gjør et lerret om til JPEG-bytes. */
  function lerretTilJpeg(canvas, kvalitet) {
    return lerretTilBlob(canvas, 'image/jpeg', kvalitet || 0.93)
      .then(function (b) { return b.arrayBuffer(); })
      .then(function (buf) { return new Uint8Array(buf); });
  }

  /** PDF av en liste lerreter, alle med mm-størrelse. sider: [{ c, mmB, mmH }] */
  function pdfAvLerreter(sider, kvalitet) {
    var ut = [];
    return sider.reduce(function (p, sd) {
      return p.then(function () {
        return lerretTilJpeg(sd.c, kvalitet).then(function (j) {
          ut.push({ jpeg: j, pxB: sd.c.width, pxH: sd.c.height, mmB: sd.mmB, mmH: sd.mmH });
        });
      });
    }, Promise.resolve()).then(function () { return lagPdfSider(ut); });
  }

  // ---------- zip (uten komprimering, «store») ----------
  var CRC_TAB = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(b) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < b.length; i++) c = CRC_TAB[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  /** filer: [{ navn, blob }] → Promise<Blob> */
  function lagZip(filer) {
    var enc = new TextEncoder();
    return Promise.all(filer.map(function (f) {
      return f.blob.arrayBuffer().then(function (buf) { return { navn: f.navn, data: new Uint8Array(buf) }; });
    })).then(function (liste) {
      var deler = [], sentral = [], pos = 0;
      var d = new Date();
      var tid = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      var dato = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      liste.forEach(function (f) {
        var navn = enc.encode(f.navn);
        var crc = crc32(f.data);
        var lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
        lh.setUint16(8, 0, true); lh.setUint16(10, tid, true); lh.setUint16(12, dato, true);
        lh.setUint32(14, crc, true); lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.data.length, true);
        lh.setUint16(26, navn.length, true); lh.setUint16(28, 0, true);
        deler.push(new Uint8Array(lh.buffer), navn, f.data);
        var ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
        ch.setUint16(10, 0, true); ch.setUint16(12, tid, true); ch.setUint16(14, dato, true);
        ch.setUint32(16, crc, true); ch.setUint32(20, f.data.length, true); ch.setUint32(24, f.data.length, true);
        ch.setUint16(28, navn.length, true); ch.setUint32(42, pos, true);
        sentral.push(new Uint8Array(ch.buffer), navn);
        pos += 30 + navn.length + f.data.length;
      });
      var sLen = sentral.reduce(function (a, b) { return a + b.length; }, 0);
      var end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true);
      end.setUint16(8, liste.length, true); end.setUint16(10, liste.length, true);
      end.setUint32(12, sLen, true); end.setUint32(16, pos, true);
      return new Blob(deler.concat(sentral, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
    });
  }

  function filnavn(tekst) {
    return String(tekst || 'cfa').toLowerCase()
      .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'cfa';
  }

  /** Koble en filvelger + dra-og-slipp-sone. flere=true gir en liste med filer. */
  function filSone(sone, input, vedFil, flere) {
    function gi(liste) {
      liste = Array.prototype.slice.call(liste || []);
      if (!liste.length) return;
      if (flere) vedFil(liste); else vedFil(liste[0]);
    }
    input.addEventListener('change', function () { gi(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) {
      sone.addEventListener(t, function (e) { e.preventDefault(); sone.classList.add('dra'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      sone.addEventListener(t, function (e) { e.preventDefault(); sone.classList.remove('dra'); });
    });
    sone.addEventListener('drop', function (e) { gi(e.dataTransfer && e.dataTransfer.files); });
  }

  function mmLerret(mmB, mmH, dpi) {
    var s = (dpi || 300) / 25.4;
    var c = document.createElement('canvas');
    c.width = Math.round(mmB * s); c.height = Math.round(mmH * s);
    return { c: c, ctx: c.getContext('2d'), s: s };
  }

  function settFont(c, vekt, px, sporing) {
    c.font = vekt + ' ' + px + 'px ' + FONT;
    if ('letterSpacing' in c) c.letterSpacing = (sporing ? sporing * px : 0) + 'px';
  }

  /** Les logoens SVG-kildekode (til vektoreksport). */
  var logoSvgPromise = null;
  function logoSvg() {
    if (!logoSvgPromise) logoSvgPromise = fetch(ASSETS + 'logo-farge.svg').then(function (r) { return r.text(); });
    return logoSvgPromise;
  }

  // ---------- fanemeny, felles for alle verktøy ----------
  var VERKTOY = [
    ['index', 'Oversikt'],
    ['arrangement', 'Arrangementspakke'],
    ['plakat', 'Plakat'],
    ['logo-plassering', 'Logo på video'],
    ['lokallag', 'Lokallag-logo'],
    ['navnelapper', 'Navnelapper'],
    ['deltakerbevis', 'Deltakerbevis'],
    ['klistremerker', 'Klistremerker'],
    ['trykksaker', 'Visittkort og roll-up'],
    ['bildekrymper', 'Bildekrymper'],
    ['samtykke', 'Samtykkeskjema'],
    ['tekstsjekk', 'Tekstsjekk']
  ];
  function byggMeny() {
    var nav = document.querySelector('nav.faner[data-aktiv]');
    if (!nav) return;
    var aktiv = nav.getAttribute('data-aktiv');
    var tilbakeLenke = '<a class="fane fane-tilbake" href="../medlem.html" style="background: rgba(192, 50, 90, 0.2); color: #f472b6; border-color: var(--rosa); display: inline-flex; align-items: center; gap: 6px; font-weight: 700;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Min side</a>';
    nav.innerHTML = tilbakeLenke + VERKTOY.map(function (v) {
      return '<a class="fane" href="' + v[0] + '.html"' + (v[0] === aktiv ? ' aria-current="page"' : '') + '>' + v[1] + '</a>';
    }).join('');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', byggMeny);
  else byggMeny();

  function sjekkHtml(punkter) {
    return punkter.map(function (x) {
      return '<li class="' + (x.ok ? '' : 'varsel') + '">' + String(x.tekst).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>';
    }).join('');
  }

  global.CfA = {
    sjekkHtml: sjekkHtml,
    FARGE: FARGE, FONT: FONT, ASSETS: ASSETS, VERKTOY: VERKTOY,
    logo: function () { return logoPromise; },
    logoSvg: logoSvg,
    lastBilde: lastBilde,
    logoBredde: logoBredde, frisone: frisone,
    tegnLogo: tegnLogo, tegnPlate: tegnPlate, tegnLogoMedNavn: tegnLogoMedNavn,
    tegnDekk: tegnDekk, tegnTilpass: tegnTilpass, rundRekt: rundRekt,
    brytTekst: brytTekst, analyserOmrade: analyserOmrade, settFont: settFont,
    lastNed: lastNed, lerretTilBlob: lerretTilBlob, lerretTilJpeg: lerretTilJpeg,
    lagPdf: lagPdf, lagPdfSider: lagPdfSider, pdfAvLerreter: pdfAvLerreter,
    lagZip: lagZip, mmLerret: mmLerret,
    filnavn: filnavn, filSone: filSone
  };
})(window);
