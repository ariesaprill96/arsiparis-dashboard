/* Peta Keterisian JF Arsiparis
 * Keterisian = ketersediaan arsiparis (BKN) ÷ kebutuhan yang direkomendasikan ANRI, per instansi.
 * Instansi pusat ditampilkan sebagai daftar; provinsi & kab/kota juga di peta (klik provinsi -> kab/kota).
 * Bergantung pada variabel global dashboard: ALL, PUSAT_CATEGORIES.
 */
(function(){
  'use strict';
  const BANDS = [
    { key:0, max:25,  label:'Kritis',            rentang:'< 25%',   c:'#a3271f' },
    { key:1, max:50,  label:'Kurang',            rentang:'25–50%',  c:'#df6d3d' },
    { key:2, max:75,  label:'Sedang',            rentang:'50–75%',  c:'#e8c15a' },
    { key:3, max:100, label:'Hampir terpenuhi',  rentang:'75–100%', c:'#5aa96a' },
    { key:4, max:Infinity, label:'Terpenuhi',    rentang:'≥ 100%',  c:'#1d7346' }
  ];
  const NA = { key:'na', label:'Belum ada rekomendasi', c:'#d9dad4' };
  const KL = { kem:'Kementerian', lemb:'Lembaga', prov:'Provinsi', kab:'Kabupaten/Kota' };
  const ASSET = 'v=20261022';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const nf = v => (Number(v) || 0).toLocaleString('id-ID');
  const pf = p => p == null ? '–' : p.toLocaleString('id-ID', { maximumFractionDigits: p < 10 ? 1 : 0 }) + '%';
  const bandOf = p => p == null ? NA : BANDS.find(b => p < b.max);
  const kl4 = kat => kat === 'Kementerian' ? 'kem' : kat === 'Provinsi' ? 'prov' : kat === 'Kabupaten/Kota' ? 'kab' : (PUSAT_CATEGORIES.includes(kat) ? 'lemb' : 'lemb');
  const shortKab = n => String(n || '').replace(/^Kabupaten /, 'Kab. ');

  /* ---------- muat pustaka & data pendukung sekali saja ---------- */
  let siap = null;
  function muat(src){ return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.head.appendChild(s); }); }
  function persiapan(){
    if (siap) return siap;
    const L = [];
    if (!window.KLUSTER_REF) L.push(muat('./assets/referensi_kluster_instansi.js?' + ASSET));
    if (!window.PADANAN_REKOMENDASI) L.push(muat('./assets/padanan_rekomendasi.js?' + ASSET));
    if (!window.PETA_INDONESIA) L.push(muat('./assets/peta_indonesia.js?' + ASSET));
    if (!window.d3) L.push(muat('https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js').catch(() => null));
    siap = Promise.all(L).then(() => window.topojson ? null : muat('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js').catch(() => null));
    return siap;
  }

  /* ---------- pencocokan nama ---------- */
  const AB = { 'kep.':'kepulauan', kep:'kepulauan', 'kab.':'kabupaten', kab:'kabupaten', 'di.':'daerah istimewa', setjen:'sekretariat jenderal', ri:'' };
  const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[\/\-]/g, ' ').replace(/[^a-z0-9. ]/g, ' ')
    .split(/\s+/).map(t => AB[t] ?? t).join(' ').replace(/\./g, ' ').replace(/\bpemerintah\b/g, ' ').replace(/\s+/g, ' ').trim();
  let IDX = null;
  function indeks(){
    if (IDX) return IDX;
    const REF = window.KLUSTER_REF || { daftar:[], padanan_bkn:{} };
    const byNorm = new Map(REF.daftar.map(d => [norm(d.n), d]));
    const byName = new Map(REF.daftar.map(d => [d.n, d]));
    const bkn = new Map();
    ((window.BKN_REKAP_2026 || {}).records || []).forEach(r => {
      const d = byName.get(REF.padanan_bkn[r.nama] || r.nama) || byNorm.get(norm(REF.padanan_bkn[r.nama] || r.nama)); if (!d) return;
      const x = bkn.get(d.n) || { total:0 }; x.total += r.total || 0; bkn.set(d.n, x);
    });
    return (IDX = { byNorm, byName, bkn });
  }
  function cariRef(nama){
    const P = window.PADANAN_REKOMENDASI || {}, I = indeks();
    if (Object.prototype.hasOwnProperty.call(P, nama)) return P[nama] ? I.byName.get(P[nama]) || null : null;
    return I.byNorm.get(norm(nama)) || null;
  }

  /* ---------- susun data ---------- */
  function data(){
    const I = indeks();
    return (window.ALL || ALL || []).map(d => {
      const ref = cariRef(d.nama), g = kl4(d.kategori);
      const keb = d.status === 'Ada Rekomendasi' ? (d.total || 0) : null;
      const ada = ref ? ((I.bkn.get(ref.n) || {}).total || 0) : null;
      const p = keb > 0 && ada != null ? ada / keb * 100 : null;
      const prov = ref ? (ref.k === 'G' ? ref.n.replace(/^Provinsi\s+/, '') : ref.k === 'H' ? ref.p : null) : null;
      return { nama:d.nama, g, keb, ada, p, kurang:keb != null && ada != null ? Math.max(0, keb - ada) : null, ref:ref ? ref.n : null, refK:ref ? ref.k : null, prov, band:bandOf(p) };
    });
  }
  // gabungan unik per instansi acuan (menghindari ketersediaan terhitung ganda)
  function gabung(rows){
    const m = new Map(); let keb = 0, ada = 0;
    rows.forEach(r => { if (r.p == null) return; const k = r.ref || r.nama; const x = m.get(k) || { keb:0, ada:r.ada }; x.keb += r.keb; m.set(k, x); });
    m.forEach(x => { keb += x.keb; ada += x.ada; });
    return { keb, ada, p:keb ? ada / keb * 100 : null, n:m.size };
  }

  /* ---------- status tampilan ---------- */
  const ST = { g:'', band:'', q:'', prov:'', sort:'p', asc:true, semua:false };
  let ROWS = [];

  function render(){
    ROWS = data();
    const dihitung = ROWS.filter(r => r.p != null), tot = gabung(ROWS);
    $('kt-pct').textContent = pf(tot.p);
    $('kt-pct-s').textContent = `${nf(tot.ada)} arsiparis tersedia untuk kebutuhan ${nf(tot.keb)} formasi`;
    $('kt-kurang').textContent = nf(dihitung.reduce((a, r) => a + r.kurang, 0));
    $('kt-n').textContent = nf(dihitung.length);
    $('kt-n-s').textContent = `dari ${nf(ROWS.length)} instansi · ${nf(ROWS.filter(r => r.keb == null).length)} belum ada rekomendasi`;
    const cnt = BANDS.map(b => dihitung.filter(r => r.band === b).length);
    $('kt-bands').innerHTML = BANDS.map((b, i) => `<button type="button" class="kt-band${ST.band === String(b.key) ? ' on' : ''}" data-band="${b.key}" aria-pressed="${ST.band === String(b.key)}">
        <i style="background:${b.c}"></i><span><b>${b.label}</b><small>${b.rentang}</small></span><em class="num">${nf(cnt[i])}</em></button>`).join('')
      + `<button type="button" class="kt-band${ST.band === 'na' ? ' on' : ''}" data-band="na" aria-pressed="${ST.band === 'na'}"><i style="background:${NA.c}"></i><span><b>Belum dihitung</b><small>tanpa rekomendasi/data</small></span><em class="num">${nf(ROWS.length - dihitung.length)}</em></button>`;
    peta(); daftar();
  }

  /* ---------- peta ---------- */
  let MAP = null;
  function peta(){
    const box = $('kt-map');
    if (!window.d3 || !window.topojson || !window.PETA_INDONESIA){ box.innerHTML = '<div class="kt-empty">Peta tidak dapat dimuat (pustaka peta diblokir jaringan). Daftar di bawah tetap dapat digunakan.</div>'; return; }
    if (!MAP) MAP = buatPeta(box);
    MAP.update();
  }
  function buatPeta(box){
    box.innerHTML = '<svg viewBox="0 0 1000 400" role="img" aria-label="Peta keterisian arsiparis per provinsi"></svg><div class="kt-tip" role="tooltip"></div>';
    const svgEl = box.querySelector('svg'), tip = box.querySelector('.kt-tip');
    const topo = window.PETA_INDONESIA, provF = topojson.feature(topo, topo.objects.prov).features, kabF = topojson.feature(topo, topo.objects.kab).features;
    const W = 1000, H = 400, proj = d3.geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], { type:'FeatureCollection', features:provF }), path = d3.geoPath(proj);
    const svg = d3.select(svgEl), g = svg.append('g'), gKab = g.append('g'), gProv = g.append('g');
    const showTip = (ev, html) => { const b = box.getBoundingClientRect(); tip.innerHTML = html; tip.style.opacity = 1;
      tip.style.left = Math.min(ev.clientX - b.left + 14, b.width - tip.offsetWidth - 8) + 'px'; tip.style.top = (ev.clientY - b.top + 14) + 'px'; };
    const hideTip = () => tip.style.opacity = 0;
    const statProv = p => gabung(ROWS.filter(r => (r.g === 'prov' || r.g === 'kab') && r.prov === p));
    const statKab = id => { const rs = ROWS.filter(r => r.ref === id); return rs.length ? gabung(rs) : null; };
    const warna = p => p == null ? NA.c : bandOf(p).c;
    const tipHtml = (nama, x) => `<b>${esc(nama)}</b>` + (x && x.p != null ? `<span class="num">${pf(x.p)} terisi</span><span class="num">${nf(x.ada)} dari ${nf(x.keb)} formasi</span><span>${bandOf(x.p).label}</span>` : '<span>Belum ada rekomendasi</span>');
    const provSel = gProv.selectAll('path').data(provF).join('path').attr('class', 'kt-prov').attr('d', path)
      .on('mousemove', (ev, f) => showTip(ev, tipHtml('Provinsi ' + f.properties.prov + ' (gabungan pemda)', statProv(f.properties.prov))))
      .on('mouseleave', hideTip).on('click', (ev, f) => { hideTip(); pilihProv(f.properties.prov); });
    const kabSel = gKab.selectAll('path').data(kabF).join('path').attr('class', 'kt-kab').attr('d', path).style('display', 'none')
      .on('mousemove', (ev, f) => showTip(ev, tipHtml(shortKab(f.properties.id), statKab(f.properties.id))))
      .on('mouseleave', hideTip).on('click', (ev, f) => { hideTip(); ST.q = f.properties.id.replace(/^(Kabupaten|Kota)\s+/, ''); $('kt-q').value = ST.q; daftar(); });
    let k = 1;
    const zoom = d3.zoom().scaleExtent([1, 40]).translateExtent([[0, 0], [W, H]]).on('zoom', ev => { k = ev.transform.k; g.attr('transform', ev.transform);
      gProv.selectAll('path').attr('stroke-width', 0.8 / k); gKab.selectAll('path').attr('stroke-width', 0.6 / k); });
    svg.call(zoom).on('dblclick.zoom', null);
    function zoomTo(fs){
      if (!fs){ svg.transition().duration(650).call(zoom.transform, d3.zoomIdentity); return; }
      const [[x0, y0], [x1, y1]] = path.bounds({ type:'FeatureCollection', features:fs }), s = Math.min(40, 0.88 / Math.max((x1 - x0) / W, (y1 - y0) / H));
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    }
    function pilihProv(p){ const sama = ST.prov === p; ST.prov = sama ? '' : p; ST.q = ''; $('kt-q').value = '';
      if (ST.prov && ST.g && ST.g !== 'prov' && ST.g !== 'kab') ST.g = '';
      update(); zoomTo(sama ? null : provF.filter(f => f.properties.prov === p)); daftar(); }
    function update(){
      if (!ST.prov){
        provSel.style('display', null).attr('fill', f => warna(statProv(f.properties.prov).p)); kabSel.style('display', 'none');
      } else {
        provSel.style('display', f => f.properties.prov === ST.prov ? 'none' : null).attr('fill', '#eeeeea');
        kabSel.style('display', f => f.properties.prov === ST.prov ? null : 'none').attr('fill', f => { const x = statKab(f.properties.id); return warna(x && x.p); });
      }
      const x = ST.prov ? statProv(ST.prov) : null;
      $('kt-crumb').innerHTML = ST.prov ? `<button type="button" data-crumb="id">Indonesia</button><span>›</span><b>${esc(ST.prov)}</b>${x && x.p != null ? ` <span class="kt-pill" style="--c:${bandOf(x.p).c}">${pf(x.p)} · ${bandOf(x.p).label}</span>` : ''}` : '<b>Indonesia</b> <span class="muted">· klik provinsi untuk melihat kab/kota</span>';
    }
    $('kt-crumb').addEventListener('click', e => { if (e.target.closest('[data-crumb="id"]')) pilihProv(ST.prov); });
    return { update, pilihProv };
  }

  /* ---------- daftar ---------- */
  function daftar(){
    let rs = ROWS.filter(r => (!ST.g || r.g === ST.g) && (!ST.prov || r.prov === ST.prov)
      && (!ST.band || (ST.band === 'na' ? r.p == null : r.p != null && String(r.band.key) === ST.band))
      && (!ST.q || r.nama.toLowerCase().includes(ST.q.toLowerCase()) || (r.ref || '').toLowerCase().includes(ST.q.toLowerCase())));
    const key = { p:r => r.p, keb:r => r.keb, ada:r => r.ada, kurang:r => r.kurang, nama:r => r.nama }[ST.sort];
    rs.sort((a, b) => { const x = key(a), y = key(b);
      if (x == null && y == null) return a.nama.localeCompare(b.nama); if (x == null) return 1; if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * (ST.asc ? 1 : -1); });
    const total = rs.length, tampil = ST.semua ? rs : rs.slice(0, 60);
    const th = (k, l, n) => `<th${n ? ' class="n"' : ''}><button type="button" data-sort="${k}" aria-sort="${ST.sort === k ? (ST.asc ? 'ascending' : 'descending') : 'none'}">${l}${ST.sort === k ? (ST.asc ? ' ↑' : ' ↓') : ''}</button></th>`;
    $('kt-count').textContent = `${nf(total)} instansi` + (ST.prov ? ` di ${ST.prov}` : '');
    $('kt-list').innerHTML = total ? `<table class="kt-table"><thead><tr><th class="no">No</th>${th('nama', 'Instansi')}<th>Kluster</th>${th('keb', 'Kebutuhan', 1)}${th('ada', 'Ketersediaan', 1)}${th('kurang', 'Kekurangan', 1)}${th('p', 'Keterisian')}</tr></thead><tbody>
      ${tampil.map((r, i) => `<tr><td class="no num">${i + 1}</td><td class="nm">${esc(r.nama)}${!r.ref ? '<small>tidak ditemukan di data BKN</small>' : ''}</td><td class="kl">${KL[r.g]}${r.prov && r.g === 'kab' ? `<small>${esc(r.prov)}</small>` : ''}</td>
        <td class="n num">${r.keb == null ? '<span class="muted">–</span>' : nf(r.keb)}</td><td class="n num">${r.ada == null ? '<span class="muted">–</span>' : nf(r.ada)}</td>
        <td class="n num">${r.kurang == null ? '<span class="muted">–</span>' : (r.kurang ? nf(r.kurang) : '<span class="muted">0</span>')}</td>
        <td class="pc">${r.p == null ? `<span class="kt-na">${r.keb == null ? 'Belum ada rekomendasi' : 'Data BKN tidak ditemukan'}</span>` :
          `<div class="kt-bar"><div class="kt-track"><i style="width:${Math.min(100, r.p)}%;background:${r.band.c}"></i></div><b class="num">${pf(r.p)}</b></div><small>${r.band.label}</small>`}</td></tr>`).join('')}
      </tbody></table>${total > tampil.length ? `<div class="kt-more"><button type="button" class="btn-pill btn-pill-ghost" id="kt-all">Tampilkan semua (${nf(total)})</button></div>` : ''}` : '<div class="kt-empty">Tidak ada instansi untuk filter ini.</div>';
  }
  function unduh(){
    const head = ['Instansi', 'Kluster', 'Provinsi', 'Kebutuhan (rekomendasi)', 'Ketersediaan (BKN)', 'Kekurangan', 'Keterisian (%)', 'Kategori'];
    const rows = ROWS.slice().sort((a, b) => (a.p ?? 1e9) - (b.p ?? 1e9)).map(r => [r.nama, KL[r.g], r.prov || '', r.keb ?? '', r.ada ?? '', r.kurang ?? '', r.p == null ? '' : r.p.toFixed(1).replace('.', ','), r.p == null ? (r.keb == null ? 'Belum ada rekomendasi' : 'Data BKN tidak ditemukan') : r.band.label]);
    const csv = [head, ...rows].map(a => a.map(v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(';')).join('\r\n');
    const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' })), download:'Keterisian JF Arsiparis.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- event ---------- */
  let terpasang = false;
  function pasang(){
    if (terpasang) return; terpasang = true;
    $('kt-bands').addEventListener('click', e => { const b = e.target.closest('[data-band]'); if (!b) return; ST.band = ST.band === b.dataset.band ? '' : b.dataset.band; ST.semua = false; render(); });
    $('kt-seg').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; ST.g = b.dataset.g; ST.semua = false;
      if (ST.g === 'kem' || ST.g === 'lemb'){ if (ST.prov && MAP) MAP.pilihProv(ST.prov); }
      document.querySelectorAll('#kt-seg [data-g]').forEach(x => x.setAttribute('aria-pressed', x.dataset.g === ST.g)); daftar(); });
    $('kt-q').addEventListener('input', e => { ST.q = e.target.value.trim(); ST.semua = false; daftar(); });
    $('kt-list').addEventListener('click', e => {
      const s = e.target.closest('[data-sort]'); if (s){ ST.asc = ST.sort === s.dataset.sort ? !ST.asc : s.dataset.sort === 'p' || s.dataset.sort === 'nama'; ST.sort = s.dataset.sort; daftar(); }
      if (e.target.id === 'kt-all'){ ST.semua = true; daftar(); } });
    $('kt-csv').addEventListener('click', unduh);
  }

  window.renderKeterisian = function(){
    if (!(window.ALL || (typeof ALL !== 'undefined' && ALL)).length) return;
    persiapan().then(() => { IDX = null; pasang(); render(); });
  };
  window.showKeterisian = function(el){
    setActiveModule(el); if (el) el.scrollIntoView({ block:'nearest', inline:'center' });
    activeCat = '__keterisian__';
    ['home-view', 'filter-view', 'progress-view', 'grafik-view', 'results-bar', 'stat-row', 'prov-wrap'].forEach(id => { const x = $(id); if (x) x.style.display = 'none'; });
    $('keterisian-view').style.display = 'block';
    hideDirectoryChrome();
    window.renderKeterisian();
    scrollContentTo('keterisian-view');
  };
})();
