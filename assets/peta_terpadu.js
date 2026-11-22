/* Peta Provinsi Terpadu: satu peta yang menggabungkan data seluruh menu per pemerintah provinsi (kab/kota tidak dihitung).
 * Arsiparis (BKN) · Keterisian (BKN ÷ rekomendasi) · NHP & TDA (Kepka ANRI 342/2025) · Level SDM (LAKE 2025).
 * Bergantung pada window.KT_API (assets/keterisian.js) dan variabel global dashboard ALL.
 */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const nf = v => (Number(v) || 0).toLocaleString('id-ID');
  const df = v => v == null ? '–' : Number(v).toLocaleString('id-ID', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const pf = p => p == null ? '–' : p.toLocaleString('id-ID', { maximumFractionDigits: p < 10 ? 1 : 0 }) + '%';
  const KAT = ['AA','A','BB','B','CC','C','D'];
  const KAT_NAMA = { AA:'Sangat Memuaskan', A:'Memuaskan', BB:'Sangat Baik', B:'Baik', CC:'Cukup', C:'Kurang', D:'Sangat Kurang' };
  const KAT_C = { AA:'#0B4F84', A:'#3574B3', BB:'#8DBBE2', B:'#D4A845', CC:'#A9592A', C:'#B23A2E', D:'#7A1F17' };
  const LV_C = ['#B23A2E','#D0763A','#D4A845','#5596CF','#0B4F84'];
  const LV_NAMA = ['Belum tersertifikasi','> 0–50%','> 50–70%','> 70–90%','> 90–100%'];
  const SEQ = ['#DCEAF6','#A9CDEA','#6AA8D8','#2F78B7','#0B4F84'];
  const NA_C = '#DADBD6';
  const METRIK = [
    { k:'arsiparis', t:'Arsiparis' }, { k:'keterisian', t:'Keterisian' }, { k:'nhp', t:'Nilai pengawasan' },
    { k:'tda', t:'Digitalisasi' }, { k:'sertifikasi', t:'Sertifikasi' }
  ];
  const ST = { m:'keterisian', prov:'' };
  let DATA = null, MAP = null, terpasang = false;

  function muat(src){ return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.head.appendChild(s); }); }
  function persiapan(){
    const L = [window.KT_API.persiapan()];
    if (!window.PENGAWASAN_NHP_PROV_2025) L.push(muat('./assets/pengawasan_nhp_provinsi_2025.js?v=20261117').catch(() => null));
    if (!window.PENGAWASAN_SDM_PROV_2025) L.push(muat('./assets/pengawasan_sdm_provinsi_2025.js?v=20261114').catch(() => null));
    return Promise.all(L);
  }

  /* ---------- gabungkan data per provinsi ---------- */
  function susun(){
    const API = window.KT_API, I = API.indeks(), REF = window.KLUSTER_REF || { daftar:[] };
    const m = new Map();
    const get = p => { if (!m.has(p)) m.set(p, { prov:p, pemprov:0, kabkota:0, nKab:0, rows:[] }); return m.get(p); };
    REF.daftar.forEach(d => {
      if (d.k === 'G'){ const x = get(d.n.replace(/^Provinsi\s+/, '')); x.pemprov += (I.bkn.get(d.n) || {}).total || 0; }
      else if (d.k === 'H' && d.p){ const x = get(d.p); x.kabkota += (I.bkn.get(d.n) || {}).total || 0; x.nKab++; }
    });
    API.data().forEach(r => { if (r.prov && r.refK === 'G') get(r.prov).rows.push(r); });
    const NHP = Object.fromEntries((window.PENGAWASAN_NHP_PROV_2025 || []).map(r => [r.prov, r]));
    const SDM = Object.fromEntries((window.PENGAWASAN_SDM_PROV_2025 || []).map(r => [r.institution.replace(/^Provinsi\s+/, ''), r]));
    m.forEach(x => {
      x.arsiparis = x.pemprov;
      const g = API.gabung(x.rows); x.keb = g.keb; x.ket = g.p; x.band = API.bandOf(g.p);
      x.nhp = NHP[x.prov] || null; x.sdm = SDM[x.prov] || null;
      x.flag = x.ket != null && x.ket < 25 && x.nhp && ['CC','C','D'].includes(x.nhp.kategori);
    });
    const vals = [...m.values()].map(x => x.arsiparis).filter(v => v > 0).sort((a, b) => a - b);
    const q = [0.2, 0.4, 0.6, 0.8].map(t => vals[Math.floor(t * (vals.length - 1))]);
    return { m, q };
  }
  const seqIdx = v => { const q = DATA.q; let i = 0; while (i < q.length && v > q[i]) i++; return i; };
  function warna(x){
    if (!x) return NA_C;
    switch (ST.m){
      case 'arsiparis': return x.arsiparis > 0 ? SEQ[seqIdx(x.arsiparis)] : NA_C;
      case 'keterisian': return x.band ? x.band.c : NA_C;
      case 'nhp': return x.nhp ? KAT_C[x.nhp.kategori] : NA_C;
      case 'tda': return x.nhp ? KAT_C[x.nhp.tda_kategori] : NA_C;
      case 'sertifikasi': return x.sdm && x.sdm.certification != null ? LV_C[x.sdm.certification] : NA_C;
    }
  }
  function nilaiTeks(x){
    if (!x) return 'tidak ada data';
    switch (ST.m){
      case 'arsiparis': return `${nf(x.arsiparis)} arsiparis`;
      case 'keterisian': return `keterisian ${pf(x.ket)}`;
      case 'nhp': return x.nhp ? `NHP ${df(x.nhp.nhp)} (${x.nhp.kategori})` : 'belum dinilai';
      case 'tda': return x.nhp ? `TDA ${df(x.nhp.tda)} (${x.nhp.tda_kategori})` : 'belum dinilai';
      case 'sertifikasi': return x.sdm ? `sertifikasi Level ${x.sdm.certification}` : 'tidak ada data';
    }
  }

  /* ---------- legenda ---------- */
  function legenda(){
    const API = window.KT_API, it = [];
    if (ST.m === 'arsiparis'){ const q = DATA.q, b = [0, ...q]; SEQ.forEach((c, i) => it.push([c, i < 4 ? `${nf(b[i])}–${nf(q[i])}` : `> ${nf(q[3])}`])); }
    if (ST.m === 'keterisian') API.BANDS.forEach(b => it.push([b.c, `${b.label} (${b.rentang})`]));
    if (ST.m === 'nhp' || ST.m === 'tda') KAT.filter(k => k !== 'D').forEach(k => it.push([KAT_C[k], `${k} · ${KAT_NAMA[k]}`]));
    if (ST.m === 'sertifikasi') LV_C.forEach((c, i) => it.push([c, `L${i} · ${LV_NAMA[i]}`]));
    it.push([NA_C, ST.m === 'nhp' || ST.m === 'tda' ? 'Belum dinilai' : 'Tidak ada data']);
    return it.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('') + `<span class="pt-flagkey"><b></b>Perlu perhatian</span>`;
  }

  /* ---------- panel samping ---------- */
  const SUMBER = {
    arsiparis:'Jumlah pejabat fungsional arsiparis pada pemerintah provinsi, data BKN November 2026. Kabupaten/kota tidak dihitung.',
    keterisian:'Ketersediaan arsiparis pemerintah provinsi (BKN) dibagi kebutuhan yang direkomendasikan ANRI untuk pemerintah provinsi.',
    nhp:'Nilai Hasil Pengawasan pemerintah provinsi, Keputusan Kepala ANRI Nomor 342 Tahun 2025.',
    tda:'Nilai Tingkat Digitalisasi Arsip pemerintah provinsi, Keputusan Kepala ANRI Nomor 342 Tahun 2025.',
    sertifikasi:'Level sertifikasi arsiparis lembaga kearsipan daerah, Laporan Hasil Pengawasan Kearsipan Eksternal 2025.'
  };
  function ringkas(){
    const xs = [...DATA.m.values()];
    let big = '', sub = '';
    if (ST.m === 'arsiparis'){ big = nf(xs.reduce((a, x) => a + x.arsiparis, 0)); sub = 'arsiparis di pemerintah provinsi'; }
    if (ST.m === 'keterisian'){ const g = window.KT_API.gabung(xs.flatMap(x => x.rows)); big = pf(g.p); sub = 'keterisian pemerintah provinsi'; }
    if (ST.m === 'nhp' || ST.m === 'tda'){ const v = xs.filter(x => x.nhp).map(x => x.nhp[ST.m]); big = df(v.reduce((a, b) => a + b, 0) / (v.length || 1)); sub = `rata-rata ${ST.m === 'nhp' ? 'NHP' : 'nilai TDA'} · ${v.length} provinsi dinilai`; }
    if (ST.m === 'sertifikasi'){ const v = xs.filter(x => x.sdm); big = `${v.filter(x => x.sdm.certification >= 3).length} dari ${v.length}`; sub = 'provinsi dengan lebih dari 70% arsiparis LKD tersertifikasi'; }
    const flag = xs.filter(x => x.flag).sort((a, b) => a.ket - b.ket);
    return `<div class="pt-k">${METRIK.find(x => x.k === ST.m).t}</div><div class="pt-big">${big}</div><div class="pt-sub">${sub}</div>
      <div class="pt-sec"><div class="pt-k">Perlu perhatian · ${flag.length} provinsi</div><p class="pt-note">Keterisian di bawah 25% dan NHP kategori CC atau C.</p>
      ${flag.length ? `<ul class="pt-flag">${flag.map(x => `<li><button type="button" data-pt-prov="${esc(x.prov)}"><span>${esc(x.prov)}</span><em>${pf(x.ket)} · ${x.nhp.kategori}</em></button></li>`).join('')}</ul>` : '<p class="pt-note">Tidak ada.</p>'}</div>
      <p class="pt-src">${SUMBER[ST.m]}</p>`;
  }
  function profil(p){
    const x = DATA.m.get(p); if (!x) return ringkas();
    const DARK = ['#8DBBE2','#D4A845','#DADBD6','#ec8e44','#e9d38f','#6fb371'];
    const chip = (c, t) => `<span class="pt-chip" style="background:${c};color:${DARK.includes(c) ? '#111722' : '#fff'}">${t}</span>`;
    const lv = (k, l) => { const v = x.sdm ? x.sdm[k] : null; return `<div class="pt-lv"><span>${l}</span><b style="background:${v == null ? NA_C : LV_C[v]};color:${v == null || v === 2 || v === 3 ? '#111722' : '#fff'}">${v == null ? '–' : 'L' + v}</b></div>`; };
    return `<button type="button" class="pt-back" data-pt-prov="">← Semua provinsi</button>
      <div class="pt-name">${esc(p)}</div>${x.flag ? '<div class="pt-alert">Perlu perhatian: keterisian rendah dan NHP di bawah B</div>' : ''}
      <div class="pt-rows">
        <div class="pt-row"><span>Arsiparis</span><b>${nf(x.arsiparis)}</b><small>pemerintah provinsi, data BKN</small></div>
        <div class="pt-row"><span>Kebutuhan direkomendasikan</span><b>${x.keb ? nf(x.keb) : '–'}</b><small>rekomendasi ANRI untuk pemerintah provinsi</small></div>
        <div class="pt-row"><span>Keterisian</span><b>${pf(x.ket)}</b>${x.band ? chip(x.band.c, x.band.label) : ''}</div>
        <div class="pt-row"><span>Nilai hasil pengawasan</span><b>${x.nhp ? df(x.nhp.nhp) : '–'}</b>${x.nhp ? chip(KAT_C[x.nhp.kategori], x.nhp.kategori + ' · peringkat ' + x.nhp.peringkat) : '<small>belum dinilai</small>'}</div>
        <div class="pt-row"><span>Digitalisasi arsip</span><b>${x.nhp ? df(x.nhp.tda) : '–'}</b>${x.nhp ? chip(KAT_C[x.nhp.tda_kategori], x.nhp.tda_kategori) : '<small>belum dinilai</small>'}</div>
      </div>
      <div class="pt-sec"><div class="pt-k">Level SDM · LAKE 2025</div>${lv('availability', 'Ketersediaan')}${lv('certification', 'Sertifikasi')}${lv('achievement', 'Berprestasi')}</div>
      <div class="pt-links"><a href="#keterisian" data-pt-go="keterisian">Peta keterisian</a><a href="#bkn" data-pt-go="bkn">Data BKN</a><a href="#pengawasan" data-pt-go="pengawasan">Pengawasan</a></div>`;
  }

  /* ---------- peta ---------- */
  function buatPeta(){
    const box = $('pt-map');
    if (!window.d3 || !window.topojson || !window.PETA_INDONESIA){ box.innerHTML = '<div class="pt-empty">Peta tidak dapat dimuat. Rincian tetap tersedia di panel samping.</div>'; return null; }
    const topo = window.PETA_INDONESIA, feats = topojson.feature(topo, topo.objects.prov).features;
    const W = 1000, H = 400, proj = d3.geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], { type:'FeatureCollection', features:feats }), path = d3.geoPath(proj);
    const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Peta Indonesia per provinsi');
    const gp = svg.append('g'), gf = svg.append('g');
    const ps = gp.selectAll('path').data(feats).join('path').attr('class', 'pt-p').attr('d', path)
      .on('click', (e, f) => pilih(ST.prov === f.properties.prov ? '' : f.properties.prov));
    ps.append('title');
    function update(){
      ps.attr('fill', f => warna(DATA.m.get(f.properties.prov))).classed('sel', f => f.properties.prov === ST.prov)
        .select('title').text(f => `${f.properties.prov} · ${nilaiTeks(DATA.m.get(f.properties.prov))}`);
      const fl = feats.filter(f => (DATA.m.get(f.properties.prov) || {}).flag);
      gf.selectAll('g').data(fl, f => f.properties.prov).join(en => { const g = en.append('g').attr('class', 'pt-fl').style('pointer-events', 'none');
        g.append('circle').attr('r', 9); g.append('circle').attr('r', 3.2).attr('class', 'in'); return g; })
        .attr('transform', f => { const c = path.centroid(f); return `translate(${c[0]},${c[1]})`; });
    }
    return { update };
  }
  function pilih(p){ ST.prov = p; gambar(); }
  function gambar(){
    document.querySelectorAll('#pt-seg [data-pt-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ptM === ST.m));
    $('pt-legend').innerHTML = legenda();
    $('pt-side').innerHTML = ST.prov ? profil(ST.prov) : ringkas();
    if (MAP) MAP.update();
  }
  function pasang(){
    if (terpasang) return; terpasang = true;
    $('pt-seg').innerHTML = METRIK.map(x => `<button type="button" data-pt-m="${x.k}" aria-pressed="${x.k === ST.m}">${x.t}</button>`).join('');
    $('pt-seg').addEventListener('click', e => { const b = e.target.closest('[data-pt-m]'); if (b){ ST.m = b.dataset.ptM; gambar(); } });
    $('pt-side').addEventListener('click', e => {
      const b = e.target.closest('[data-pt-prov]'); if (b){ pilih(b.dataset.ptProv); return; }
      const g = e.target.closest('[data-pt-go]'); if (g){ e.preventDefault(); location.hash = g.dataset.ptGo; if (window.bukaDariHash) window.bukaDariHash(); }
    });
    MAP = buatPeta();
  }
  window.renderPetaTerpadu = function(){
    const all = window.ALL || (typeof ALL !== 'undefined' ? ALL : []);
    if (!$('peta-terpadu') || !window.KT_API || !all.length) return;
    persiapan().then(() => { DATA = susun(); pasang(); gambar(); });
  };
})();
