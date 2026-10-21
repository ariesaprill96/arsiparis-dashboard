/* Mesin hitung kebutuhan JF Arsiparis.
 * Rumus dasar (sesuai Excel master):  kebutuhan = Σ (waktu penyelesaian × volume) ÷ WKE
 * Bekerja di browser maupun Node (untuk pengujian).
 */
(function (root) {
  'use strict';
  const SPEC = root.JFA_SPEC;
  const JENJANG = [
    { key:'terampil',     label:'Terampil' },
    { key:'mahir',        label:'Mahir' },
    { key:'penyelia',     label:'Penyelia' },
    { key:'ahli_pertama', label:'Ahli Pertama' },
    { key:'ahli_muda',    label:'Ahli Muda' },
    { key:'ahli_madya',   label:'Ahli Madya' },
    { key:'ahli_utama',   label:'Ahli Utama', tersembunyi:true }
  ];
  const WKE_DEFAULT = 75000;          // menit per tahun
  const MENIT_PER_HARI = 330;

  // Perbaikan yang disepakati terhadap Excel master (bisa dimatikan untuk uji silang).
  const PERBAIKAN = {
    // Usul serah dihitung dari Unit Pengolah tanpa Ahli Pertama (Excel: tanpa Ahli Muda),
    // karena yang menggarap daftar & penyerahan arsip adalah Ahli Pertama.
    // Kunci = mode formulir; IN!G.. = nilai turunan yang ditampilkan di bawah isian.
    nodes: {
      upuk: { 'IA!G51': "v('IA!G27')+(v('IA!D48')*v('IA!D51'))", 'IN!G51': "v('IN!G27')+(v('IN!D48')*v('IN!D51'))" },
      ukii: { 'IA!G51': "v('IA!G27')+(v('IA!D48')*v('IA!D51'))" },
      lkd:  { 'IA!G51': "v('IA!G27')+(v('IA!D48')*v('IA!D51'))", 'IN!G49': "v('IN!G27')+(v('IN!D46')*v('IN!D49'))" }
    },
    // Layanan arsip terjaga: 1.650 menit per laporan (Excel: 10 menit, diduga salah ketik).
    waktu: { 'Memberikan layanan arsip terjaga.': 1650 }
  };

  const IFERR = (x, y) => (typeof x === 'number' && isFinite(x)) ? x : y;
  const compiled = {};
  function compile(expr) {
    if (!compiled[expr]) compiled[expr] = new Function('v', 'IFERR', 'return (' + expr + ');');
    return compiled[expr];
  }
  const bulat = x => Math.round(x + 1e-9);             // pembulatan biasa (0,5 ke atas)

  function hitung(mode, isian, opsi) {
    opsi = opsi || {};
    const spec = SPEC[mode];
    if (!spec) throw new Error('Mode tidak dikenal: ' + mode);
    const wke = Number(opsi.wke) > 0 ? Number(opsi.wke) : WKE_DEFAULT;
    const pakaiPerbaikan = opsi.perbaikan !== false;
    const nodes = Object.assign({}, spec.nodes, pakaiPerbaikan ? (PERBAIKAN.nodes[mode] || {}) : {});
    const memo = {};
    function v(ref) {
      if (ref in memo) return memo[ref];
      let val = 0;
      if (nodes[ref] != null) {
        memo[ref] = 0;                                     // cegah siklus
        val = Number(compile(nodes[ref])(v, IFERR)) || 0;
      } else if (ref.startsWith('IN!')) {
        const x = Number((isian || {})[ref.slice(3)]);
        val = isFinite(x) ? x : 0;
      }
      return (memo[ref] = val);
    }
    const hasil = {}; let totalMenit = 0;
    JENJANG.forEach(j => hasil[j.key] = { key:j.key, label:j.label, tersembunyi:!!j.tersembunyi, kebutuhan:0, bulat:0, menit:0, kegiatan:[] });
    spec.acts.forEach(a => {
      const waktu = pakaiPerbaikan && PERBAIKAN.waktu[a.uraian] ? PERBAIKAN.waktu[a.uraian] : a.waktu;
      const vol = v(a.jenjang + '!F' + a.row);
      if (!vol) return;
      const menit = waktu * vol;
      const h = hasil[a.jenjang];
      h.menit += menit; totalMenit += menit;
      h.kegiatan.push({ id:a.id, uraian:a.uraian, induk:a.induk, satuan:a.satuan, waktu, volume:vol, menit, kebutuhan:menit / wke });
    });
    // Tugas lain (uraian bebas) – dihitung per jenjang yang dipilih pengguna
    (opsi.tugasLain || []).forEach((t, i) => {
      const waktu = Number(t.waktu) || 0, vol = Number(t.volume) || 0;
      if (!waktu || !vol || !hasil[t.jenjang]) return;
      const menit = waktu * vol, h = hasil[t.jenjang];
      h.menit += menit; totalMenit += menit;
      h.kegiatan.push({ id:'lain-' + i, uraian:t.uraian || 'Tugas lain', satuan:t.satuan || '', waktu, volume:vol, menit, kebutuhan:menit / wke, tugasLain:true });
    });
    JENJANG.forEach(j => { const h = hasil[j.key]; h.kebutuhan = h.menit / wke; h.bulat = bulat(h.kebutuhan); });
    const tampil = JENJANG.filter(j => !j.tersembunyi);
    const turunan = {};
    spec.inputs.forEach(f => { if (f.turunan_cell) turunan[f.cell] = v('IN!' + f.turunan_cell); });
    return {
      mode, wke, jenjang:hasil, urutan:tampil.map(j => j.key),
      total:tampil.reduce((a, j) => a + hasil[j.key].kebutuhan, 0),
      totalBulat:tampil.reduce((a, j) => a + hasil[j.key].bulat, 0),
      totalMenit, turunan,
      _v: v
    };
  }

  root.JFA = { SPEC, JENJANG, WKE_DEFAULT, MENIT_PER_HARI, PERBAIKAN, hitung, bulat };
  if (typeof module !== 'undefined') module.exports = root.JFA;
})(typeof window !== 'undefined' ? window : globalThis);
