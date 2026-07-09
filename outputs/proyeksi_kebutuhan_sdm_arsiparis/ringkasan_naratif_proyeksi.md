# Proyeksi Kebutuhan Nasional SDM Jabatan Fungsional Arsiparis

## Statistik Regresi OLS

- Slope: 368,327 orang/bulan
- Intercept: 23.402,555
- R-squared: 0,9799
- p-value slope: 0,0101
- Standard error slope: 37,323
- 95% CI slope: 207,738 s.d. 528,916 orang/bulan

## Ringkasan Naratif

Berdasarkan empat titik data nasional, yaitu Juni 2025, Mei 2026, Juni 2026, dan Juli 2026, model regresi linear sederhana menghasilkan kecenderungan kenaikan sebesar 368,3 arsiparis per bulan. Namun demikian, interpretasi tren perlu dilakukan secara hati-hati karena jumlah observasi sangat terbatas dan tiga titik terakhir berada dalam rentang waktu yang berdekatan. Dengan R-squared sebesar 0,980, model ini terutama berguna sebagai baseline indikatif, bukan sebagai angka prediksi presisi.

Jika kecenderungan linear tersebut digunakan untuk proyeksi sampai Juli 2031, jumlah arsiparis nasional diperkirakan mencapai 50.290 orang, dengan rentang confidence interval 95% sekitar 39.978 sampai 60.603 orang. Dibandingkan dengan kebutuhan ideal berdasarkan rekomendasi dashboard sebesar 130.716 orang, masih terdapat gap sekitar 80.426 orang atau 61,5% dari kebutuhan ideal pada titik estimasi 2031.

Dengan demikian, pertumbuhan alamiah berdasarkan tren historis singkat belum memadai untuk menutup kekurangan nasional JFA dalam lima tahun. Selain itu, coverage rekomendasi baru sekitar 46% nasional, sehingga angka kebutuhan ideal dan kekurangan yang digunakan dalam pembandingan ini masih berpotensi underestimate terhadap kebutuhan riil, terutama pada pemerintah kabupaten/kota yang cakupan rekomendasinya relatif lebih rendah.

## Keterbatasan Metodologis

- Model hanya memakai empat titik waktu sehingga parameter regresi memiliki ketidakpastian tinggi.
- Asumsi linearitas belum tentu menangkap pola non-linear akibat siklus formasi CPNS/PPPK, anggaran, dan kebijakan pembinaan JFA.
- Pembagian proyeksi per jenjang memakai proporsi komposisi dashboard Juli 2026 sebagai simplifying assumption.
- Data BKN 2025 tidak memuat usia/tanggal lahir, sehingga proyeksi pensiun berbasis usia tidak dihitung.
- Perubahan nomenklatur/restrukturisasi kementerian dapat memengaruhi perbandingan per instansi dan tidak boleh langsung dibaca sebagai rekrutmen bersih.

## Tabel Proyeksi Tahunan

| tahun | bulan_ke | total_estimasi | total_ci_bawah | total_ci_atas | Terampil | Mahir | Penyelia | Ahli Pertama | Ahli Muda | Ahli Madya | Ahli Utama |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026 | 13 | 28191 | 27132 | 29250 | 7098 | 918 | 602 | 13727 | 4712 | 1109 | 25 |
| 2027 | 25 | 32611 | 29907 | 35315 | 8211 | 1062 | 696 | 15879 | 5451 | 1283 | 29 |
| 2028 | 37 | 37031 | 32456 | 41605 | 9324 | 1206 | 791 | 18031 | 6190 | 1456 | 33 |
| 2029 | 49 | 41451 | 34972 | 47929 | 10437 | 1350 | 885 | 20183 | 6929 | 1630 | 37 |
| 2030 | 61 | 45871 | 37478 | 54263 | 11550 | 1494 | 980 | 22335 | 7667 | 1804 | 41 |
| 2031 | 73 | 50290 | 39978 | 60603 | 12663 | 1638 | 1074 | 24487 | 8406 | 1977 | 45 |

## Gap 2031 terhadap Kebutuhan Ideal

| skenario_2031 | proyeksi_tersedia | kebutuhan_ideal | gap | persen_belum_terpenuhi |
| --- | --- | --- | --- | --- |
| Batas bawah 95% CI | 39978 | 130716 | 90738 | 69,4 |
| Titik estimasi | 50290 | 130716 | 80426 | 61,5 |
| Batas atas 95% CI | 60603 | 130716 | 70113 | 53,6 |
