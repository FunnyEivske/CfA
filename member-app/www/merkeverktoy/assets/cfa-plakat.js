/* Cosplay for Alle – plakatmotor. Brukes av plakatgeneratoren og arrangementspakken.
   Mål fra merkehåndboken: side 6 (logohøyde), 7 (logo med navn), 10 (farger), 11 (typografi), 13 (marger), 14 (sosiale medier). */
(function (CfA) {
  'use strict';
  var F = CfA.FARGE;
  var PT = 25.4 / 72; // mm per punkt
  var settFont = CfA.settFont;

  var FORMATER = {
    a5: { navn: 'A5', trykk: true, b: 148, h: 210, marg: 10, logo: 25, f: 148 / 210 },
    a4: { navn: 'A4', trykk: true, b: 210, h: 297, marg: 15, logo: 35, f: 1 },
    a3: { navn: 'A3', trykk: true, b: 297, h: 420, marg: 20, logo: 50, f: 297 / 210 },
    innlegg: { navn: 'Innlegg 4:5', trykk: false, b: 1080, h: 1350, sone: { t: 64, r: 64, b: 64, l: 64 }, logo: 180 },
    kvadrat: { navn: 'Kvadrat 1:1', trykk: false, b: 1080, h: 1080, sone: { t: 64, r: 64, b: 64, l: 64 }, logo: 180 },
    story: { navn: 'Story 9:16', trykk: false, b: 1080, h: 1920, sone: { t: 250, r: 160, b: 420, l: 64 }, logo: 200 },
    // Facebook-arrangement: Facebooks anbefalte mål. Ikke i håndboken, så vi bruker reglene for innlegg.
    fbevent: { navn: 'Facebook-arrangement', trykk: false, liggende: true, b: 1920, h: 1005, sone: { t: 64, r: 64, b: 64, l: 64 }, logo: 160 }
  };
  // Tittel: Arial Bold 28–36 pt på A4. Brødtekst 12–14 pt.
  var TITTEL_PT = [28, 32, 36];
  var TITTEL_PX = [66, 78, 92];

  function ease(v) { v = Math.max(0, Math.min(1, v)); return 1 - Math.pow(1 - v, 3); }

  /**
   * Tegn plakaten. s = lerretspiksler per enhet (mm for trykk, px for sosiale).
   * t: { format, bilde, medBilde, bildeHoyde, fx, fy, merkelapp, tittel, hva, nar, hvor, beskrivelse,
   *      storrelse, bakgrunn, logotype, lokallag, anim? }
   * anim (valgfri): { zoom, lapp, tittel, info, tekst } der 0–1 er hvor langt hvert element har kommet inn.
   * Returnerer målinger til sjekklisten.
   */
  function tegnPlakat(c, t, s, hjelp, logo) {
    var fm = t.format;
    var W = fm.b, H = fm.h;
    var bilde = t.bilde;
    var a = t.anim || null;
    var mal = {};
    c.save();
    c.setTransform(s, 0, 0, s, 0, 0);

    var bak = t.bakgrunn === 'vinrod' ? F.vinrod : t.bakgrunn === 'gra' ? F.lysgra : F.hvit;
    var tittelFarge = t.bakgrunn === 'vinrod' ? F.hvit : F.vinrod;
    var tekstFarge = t.bakgrunn === 'vinrod' ? F.hvit : F.tekst;
    var etikettFarge = t.bakgrunn === 'vinrod' ? F.gull : F.vinrod;
    c.fillStyle = bak;
    c.fillRect(0, 0, W, H);

    var trykk = fm.trykk;
    var f = trykk ? fm.f : 1;
    var sone = trykk ? { t: fm.marg, r: fm.marg, b: fm.marg, l: fm.marg } : fm.sone;
    var avst = trykk ? { a4: 4 * f, a8: 8 * f, a12: 12 * f } : { a4: 14, a8: 28, a12: 42 };
    var tittelStr = trykk ? TITTEL_PT[t.storrelse] * PT * f : TITTEL_PX[t.storrelse];
    var brodStr = trykk ? 13 * PT * f : 36;
    var lappSkala = (t.lappStorrelse === 'liten' || t.lappStorrelse === 0 || t.lappStorrelse === '0') ? 0.8 : ((t.lappStorrelse === 'stor' || t.lappStorrelse === 2 || t.lappStorrelse === '2') ? 1.25 : 1.0);
    var lappStr = Math.round((trykk ? 10 * PT * f : 28) * lappSkala);
    var logoH = fm.logo;
    var x = CfA.frisone(logoH);
    var innB = W - sone.l - sone.r;
    var y = sone.t;
    var undertekst = t.lokallag || 'Sammen om kreativitet';

    var LAPP_STILER = {
      gull: { bg: F.gull, fg: F.vinrod, border: null },
      lysgra: { bg: '#EAEAEA', fg: F.tekst, border: '#CCCCCC' },
      gra: { bg: '#EAEAEA', fg: F.tekst, border: '#CCCCCC' },
      vinrod: { bg: F.vinrod, fg: F.hvit, border: null },
      hvit: { bg: F.hvit, fg: F.vinrod, border: '#D5D5D5' },
      stalgra: { bg: F.stalgra, fg: F.hvit, border: null }
    };

    function finnMerkelapper(obj) {
      if (Array.isArray(obj.merkelapper) && obj.merkelapper.length > 0) {
        return obj.merkelapper.map(function (item) {
          if (typeof item === 'string') return { tekst: item.trim(), farge: obj.lappFarge || 'gull' };
          return { tekst: (item.tekst || '').trim(), farge: item.farge || obj.lappFarge || 'gull' };
        }).filter(function (it) { return it.tekst.length > 0; });
      }
      if (obj.merkelapp) {
        return String(obj.merkelapp).split(/[,;]/).map(function (s) {
          return { tekst: s.trim(), farge: obj.lappFarge || 'gull' };
        }).filter(function (it) { return it.tekst.length > 0; });
      }
      return [];
    }

    var lapper = finnMerkelapper(t);

    function beregnLappRader(ctxInst, lpListe, maksB) {
      if (!lpListe.length) return { rader: [], totalH: 0, radH: 0, radAvst: 0, gap: 0 };
      ctxInst.save();
      settFont(ctxInst, '700', lappStr, 0.02);
      var lp = lappStr * 0.55;
      var radH = lappStr * 1.6;
      var radAvst = lappStr * 0.35;
      var gap = lappStr * 0.4;
      var rader = [];
      var currRad = [];
      var currB = 0;

      lpListe.forEach(function (lpItem) {
        var tekstB = ctxInst.measureText(lpItem.tekst).width;
        var boksB = tekstB + 2 * lp;
        if (currRad.length > 0 && currB + gap + boksB > maksB) {
          rader.push(currRad);
          currRad = [{ item: lpItem, b: boksB, lp: lp }];
          currB = boksB;
        } else {
          currRad.push({ item: lpItem, b: boksB, lp: lp });
          currB += (currRad.length === 1 ? 0 : gap) + boksB;
        }
      });
      if (currRad.length > 0) rader.push(currRad);
      ctxInst.restore();

      var totalH = rader.length * radH + Math.max(0, rader.length - 1) * radAvst;
      return { rader: rader, totalH: totalH, radH: radH, radAvst: radAvst, gap: gap };
    }

    // Liggende format: bildet fyller høyre halvdel, teksten står i venstre panel
    var panelB = W;
    if (fm.liggende) {
      panelB = t.medBilde ? Math.round(W * 0.5) : W;
      innB = panelB - sone.l - (t.medBilde ? 56 : sone.r);
      if (t.medBilde) {
        var bx = panelB, bw = W - panelB;
        c.save();
        c.beginPath(); c.rect(bx, 0, bw, H); c.clip();
        tegnBildeZoom(c, bilde, bx, 0, bw, H, t.fx, t.fy, a ? a.zoom : 1);
        c.restore();
        var sk = Math.max(bw / bilde.naturalWidth, H / bilde.naturalHeight);
        mal.skjermSkala = 1 / sk;
      }
    }

    var logoBoks = null;
    function merkeBredde() {
      if (t.logotype !== 'navn') return CfA.logoBredde(logoH);
      c.save(); settFont(c, '700', 0.35 * logoH, 0);
      var navnB = c.measureText('Cosplay for Alle').width;
      settFont(c, '400', 0.45 * 0.35 * logoH, 0);
      var underB = c.measureText(undertekst).width;
      c.restore();
      return CfA.logoBredde(logoH) * 1.25 + Math.max(navnB, underB);
    }
    function tegnMerke(lx, ly) {
      var bredde = merkeBredde();
      if (lx === 'hoyre') lx = W - sone.r - bredde;
      if (t.bakgrunn === 'vinrod') {
        c.save(); c.fillStyle = F.hvit;
        CfA.rundRekt(c, lx - x, ly - x, bredde + 2 * x, logoH + 2 * x, x * 0.35); c.fill(); c.restore();
      }
      if (t.logotype === 'navn') {
        if ('letterSpacing' in c) c.letterSpacing = '0px';
        CfA.tegnLogoMedNavn(c, logo, lx, ly, logoH, undertekst);
      } else {
        CfA.tegnLogo(c, logo, lx, ly, logoH);
      }
      logoBoks = { x: lx, y: ly, w: bredde, h: logoH };
    }

    // Logo øverst til venstre på sosiale medier (side 14). Logoen animeres aldri.
    if (!trykk && logo) {
      tegnMerke(sone.l, sone.t);
      y = sone.t + logoH + x + avst.a8;
    }

    var bunn = trykk ? H - sone.b - logoH - x : H - sone.b;

    c.save();
    settFont(c, '700', tittelStr, -0.02);
    var tittelLinjer = CfA.brytTekst(c, t.tittel, innB);
    c.restore();

    function tekstHoyde() {
      var h = 0;
      c.save();
      if (lapper.length) {
        var lappPlan = beregnLappRader(c, lapper, innB);
        h += lappPlan.totalH + avst.a8;
      }
      h += tittelLinjer.length * tittelStr * 1.04 + avst.a8;
      var rr = [t.hva, t.nar, t.hvor].filter(Boolean);
      if (rr.length) {
        settFont(c, '700', brodStr, 0);
        var k = c.measureText('Hvor').width + brodStr * 1.1;
        settFont(c, '400', brodStr, 0);
        rr.forEach(function (v) { h += CfA.brytTekst(c, v, innB - k).length * brodStr * 1.45 + avst.a4 * 0.5; });
        h += avst.a8;
      }
      if (t.beskrivelse) {
        settFont(c, '400', brodStr, 0);
        h += CfA.brytTekst(c, t.beskrivelse, Math.min(innB, brodStr * 34)).length * brodStr * 1.45;
      }
      c.restore();
      return h;
    }

    // Liggende: midtstill tekstblokken i høyden under logoen
    if (fm.liggende) {
      var ledig = bunn - y - tekstHoyde();
      if (ledig > 0) y += ledig * 0.35;
    }

    // Bilde (stående formater)
    if (t.medBilde && !fm.liggende) {
      var onsket = innB * t.bildeHoyde;
      var plass = bunn - y - avst.a12 - tekstHoyde();
      var bh = Math.max(innB * 0.25, Math.min(onsket, plass));
      mal.bildeKrympet = bh < onsket - 0.5;
      var r = trykk ? 1.2 : 10;
      c.save();
      CfA.rundRekt(c, sone.l, y, innB, bh, r); c.clip();
      tegnBildeZoom(c, bilde, sone.l, y, innB, bh, t.fx, t.fy, a ? a.zoom : 1);
      c.restore();
      var skala = Math.max(innB / bilde.naturalWidth, bh / bilde.naturalHeight);
      mal.dpi = trykk ? Math.round(25.4 / skala) : null;
      mal.skjermSkala = trykk ? null : 1 / skala;
      y += bh + avst.a12;
    }

    function gruppe(navn, fn) {
      if (!a) { fn(); return; }
      var v = ease(a[navn] == null ? 1 : a[navn]);
      if (v <= 0) return;
      c.save();
      c.globalAlpha = v;
      c.translate(0, (1 - v) * (trykk ? 6 : 40));
      fn();
      c.restore();
    }

    // Merkelapper (kan være én eller flere, med farge og størrelse)
    if (lapper.length) {
      var ly0 = y;
      var plan = beregnLappRader(c, lapper, innB);
      gruppe('lapp', function () {
        c.save();
        settFont(c, '700', lappStr, 0.02);
        var curY = ly0;
        plan.rader.forEach(function (rad) {
          var curX = sone.l;
          rad.forEach(function (bLapp) {
            var stil = LAPP_STILER[bLapp.item.farge] || LAPP_STILER.gull;
            c.fillStyle = stil.bg;
            CfA.rundRekt(c, curX, curY, bLapp.b, plan.radH, plan.radH * 0.25);
            c.fill();
            if (stil.border) {
              c.strokeStyle = stil.border;
              c.lineWidth = Math.max(1, lappStr * 0.05);
              c.stroke();
            }
            c.fillStyle = stil.fg;
            c.textBaseline = 'middle';
            c.fillText(bLapp.item.tekst, curX + bLapp.lp, curY + plan.radH * 0.52);
            curX += bLapp.b + plan.gap;
          });
          curY += plan.radH + plan.radAvst;
        });
        c.restore();
      });
      y += plan.totalH + avst.a8;
    }

    // Tittel: linjeavstand 1,0, sporing −2 %
    var ty0 = y;
    gruppe('tittel', function () {
      c.save();
      settFont(c, '700', tittelStr, -0.02);
      c.fillStyle = tittelFarge;
      c.textBaseline = 'alphabetic';
      tittelLinjer.forEach(function (l, i) { c.fillText(l, sone.l, ty0 + tittelStr * 0.78 + i * tittelStr * 1.04); });
      c.restore();
    });
    y += tittelLinjer.length * tittelStr * 1.04 + avst.a8;
    mal.tittelLinjer = tittelLinjer.length;

    // Praktisk info: hva, når, hvor
    var rader = [['Hva', t.hva], ['Når', t.nar], ['Hvor', t.hvor]].filter(function (r) { return r[1]; });
    if (rader.length) {
      c.save();
      settFont(c, '700', brodStr, 0);
      var kol = Math.max.apply(null, rader.map(function (r) { return c.measureText(r[0]).width; })) + brodStr * 1.1;
      c.restore();
      var iy0 = y;
      var radPos = [];
      c.save();
      settFont(c, '400', brodStr, 0);
      rader.forEach(function (r) {
        var linjer = CfA.brytTekst(c, r[1], innB - kol);
        radPos.push({ y: y, r: r, linjer: linjer });
        y += linjer.length * brodStr * 1.45 + avst.a4 * 0.5;
      });
      c.restore();
      gruppe('info', function () {
        radPos.forEach(function (p) {
          settFont(c, '700', brodStr, 0);
          c.fillStyle = etikettFarge;
          c.fillText(p.r[0], sone.l, p.y + brodStr * 0.95);
          settFont(c, '400', brodStr, 0);
          c.fillStyle = tekstFarge;
          p.linjer.forEach(function (l, i) { c.fillText(l, sone.l + kol, p.y + brodStr * 0.95 + i * brodStr * 1.45); });
        });
      });
      y += avst.a8;
      void iy0;
    }

    // Brødtekst, linjeavstand 1,45, maks ca. 75 tegn per linje
    if (t.beskrivelse) {
      c.save();
      settFont(c, '400', brodStr, 0);
      var linjer = CfA.brytTekst(c, t.beskrivelse, Math.min(innB, brodStr * 34));
      c.restore();
      var by0 = y;
      gruppe('tekst', function () {
        settFont(c, '400', brodStr, 0);
        c.fillStyle = tekstFarge;
        linjer.forEach(function (l, i) { c.fillText(l, sone.l, by0 + brodStr * 0.95 + i * brodStr * 1.45); });
      });
      y += linjer.length * brodStr * 1.45;
    }

    mal.innholdBunn = y;
    mal.bunn = bunn;
    if (y > bunn + 0.01) mal.overlapp = true;

    // Logo nederst på trykk (side 13: logo nede til høyre, side 7: liggende i bunnen av plakater)
    if (trykk && logo) {
      tegnMerke(t.logotype === 'navn' ? sone.l : 'hoyre', H - sone.b - logoH);
    }

    if (hjelp) {
      c.save();
      var px1 = 1 / s;
      c.lineWidth = 1.5 * px1;
      c.setLineDash([5 * px1, 4 * px1]);
      c.strokeStyle = F.gull;
      c.strokeRect(sone.l, sone.t, (fm.liggende ? innB : W - sone.l - sone.r), H - sone.t - sone.b);
      if (logoBoks) {
        c.strokeStyle = mal.overlapp ? '#D0021B' : F.vinrod;
        c.globalAlpha = 0.8;
        c.strokeRect(logoBoks.x - x, logoBoks.y - x, logoBoks.w + 2 * x, logoBoks.h + 2 * x);
      }
      if (mal.overlapp) {
        c.globalAlpha = 0.18; c.fillStyle = '#D0021B';
        c.fillRect(sone.l, bunn, innB, Math.min(y, H) - bunn);
      }
      c.restore();
    }
    c.restore();
    mal.logoH = logoH; mal.x = x; mal.fm = fm;
    return mal;
  }

  function tegnBildeZoom(c, bilde, x, y, w, h, fx, fy, zoom) {
    var z = zoom || 1;
    var dw = w * z, dh = h * z;
    CfA.tegnDekk(c, bilde, x - (dw - w) * (fx == null ? 0.5 : fx), y - (dh - h) * (fy == null ? 0.5 : fy), dw, dh, fx, fy);
  }

  function navnFeil(tekst) {
    var feil = [];
    var re = /cosplay\s*(?:for|4)\s*all[e]?/gi, m;
    while ((m = re.exec(tekst))) {
      if (m[0] !== 'Cosplay for Alle' && m[0] !== 'Cosplay for All') feil.push(m[0]);
    }
    return feil;
  }

  /** Sjekkliste for en plakat: [{ ok, tekst }] */
  function sjekkPlakat(t, m) {
    var fm = t.format;
    var punkter = [];
    function p(ok, tekst) { punkter.push({ ok: ok, tekst: tekst }); }
    p(true, 'Logoen i sine tre farger, ' + fm.logo + (fm.trykk ? ' mm' : ' px') + ' høy' + (t.bakgrunn === 'vinrod' ? ', på hvit plate' : ''));
    if (fm.trykk) {
      p(!m.overlapp, m.overlapp
        ? 'Teksten går inn i logoens frihetssone. Kort ned teksten, velg mindre bilde eller mindre tittel.'
        : 'Teksten holder seg innenfor margen og unna logoen');
    } else {
      p(!m.overlapp, m.overlapp
        ? 'Teksten går utenfor den trygge sonen. Kort ned teksten eller gjør bildet lavere.'
        : 'Alt står innenfor den trygge sonen');
    }
    if (t.medBilde && fm.trykk && m.dpi) {
      if (m.dpi >= 250) p(true, 'Bildet holder ' + m.dpi + ' dpi i ferdig størrelse');
      else p(false, 'Bildet holder bare ' + m.dpi + ' dpi. Trykkeriet trenger 300 dpi, så bruk et større bilde eller en mindre bildeflate.');
    } else if (t.medBilde && !fm.trykk && m.skjermSkala) {
      p(m.skjermSkala >= 0.9, m.skjermSkala >= 0.9 ? 'Bildet er stort nok for skjerm' : 'Bildet blir forstørret og kan se uskarpt ut');
    }
    if (m.bildeKrympet && !m.overlapp) p(true, 'Bildet er gjort lavere så teksten får plass');
    if (m.tittelLinjer > 3 || t.tittel.length > 60) p(false, 'Tittelen er lang. Korte titler på én til to linjer leses best.');
    else if (!t.tittel) p(false, 'Plakaten mangler tittel');
    var lappeTekster = (t.merkelapper || []).map(function (l) { return typeof l === 'string' ? l : (l.tekst || ''); }).join(' ');
    var alt = [t.tittel, t.hva, t.nar, t.hvor, t.beskrivelse, t.merkelapp, lappeTekster, t.lokallag].join(' \n ');
    var feil = navnFeil(alt);
    if (feil.length) p(false, 'Navnet skrives «Cosplay for Alle», ikke «' + feil[0] + '»');
    else if (/\bCfA\b/.test(alt)) p(false, 'CfA brukes ikke alene på plakater. Skriv Cosplay for Alle.');
    else p(true, 'Navnet er skrevet riktig');
    return punkter;
  }

  function sjekkHtml(punkter) {
    return punkter.map(function (x) {
      return '<li class="' + (x.ok ? '' : 'varsel') + '">' + String(x.tekst).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>';
    }).join('');
  }

  /** Lag et lerret i full eksportstørrelse. Trykk: 300 dpi. */
  function eksportLerret(t, logo) {
    var fm = t.format;
    var s = fm.trykk ? 300 / 25.4 : 1;
    var c = document.createElement('canvas');
    c.width = Math.round(fm.b * s);
    c.height = Math.round(fm.h * s);
    tegnPlakat(c.getContext('2d'), t, s, false, logo);
    return c;
  }

  CfA.PLAKAT = { FORMATER: FORMATER };
  CfA.tegnPlakat = tegnPlakat;
  CfA.sjekkPlakat = sjekkPlakat;
  CfA.sjekkHtml = sjekkHtml;
  CfA.navnFeil = navnFeil;
  CfA.eksportPlakat = eksportLerret;
})(window.CfA);
