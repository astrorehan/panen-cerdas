import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const QUESTIONS = [
  {
    q: "Dari mana sumber data cuaca dan citra satelitnya?",
    a: "Data cuaca harian (curah hujan, suhu, radiasi) diambil real-time dari NASA POWER dengan cache 24 jam. NDVI vegetasi direncanakan dari Sentinel-2 via Google Earth Engine; saat MVP masih menggunakan nilai default. Data historis panen padi bersumber dari BPS Jawa Barat 2018-2024.",
  },
  {
    q: "Seberapa akurat prediksi panennya?",
    a: "Model XGBoost saat ini dilatih di atas 5.000 sampel sintetis dengan noise Gaussian 7%. Pada validasi time-based (train 2018-2022, test 2023-2024), MAE berkisar 0.4-0.6 ton/ha. Akurasi akan terus naik seiring penambahan data feedback realisasi panen dari pengguna.",
  },
  {
    q: "Apakah aplikasi ini hanya untuk padi?",
    a: "Ya - cakupan MVP sengaja dibatasi pada padi di Jawa Barat untuk memastikan kualitas model. Komoditas lain (jagung, cabai) dan provinsi lain akan ditambahkan setelah validasi pilot.",
  },
  {
    q: "Apakah data lahan saya aman?",
    a: "Untuk MVP, autentikasi menggunakan role-based localStorage (tanpa akun). Tidak ada data pribadi yang dikirim ke server. Mode produksi nanti akan menggunakan JWT dan database terenkripsi sesuai standar UU PDP.",
  },
  {
    q: "Kenapa gratis selama hackathon?",
    a: "Panen Cerdas dibuat untuk UNITY Competition 14 UNY 2026 sebagai pembuktian konsep. Tier Petani akan tetap gratis untuk individu, sementara tier Pemerintah akan masuk fase pilot project berbayar setelah validasi.",
  },
  {
    q: "Bagaimana saya bisa berkontribusi atau bermitra?",
    a: "Hubungi kami via email atau GitHub - repositori sumber tersedia publik di github.com/astrorehan/panen-cerdas. Kami terbuka untuk kolaborasi dengan dinas pertanian, peneliti agronomi, dan komunitas open source.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="container scroll-mt-24 py-20 md:py-28">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="sticky top-28">
            <div className="eyebrow">FAQ</div>
            <h2 className="mt-5 h-section text-balance">
              Pertanyaan yang sering ditanyakan
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Belum menemukan jawabannya? Kirim pertanyaan via{" "}
              <a
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="mailto:mraihansurya1@gmail.com"
              >
                email
              </a>
              .
            </p>
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-border bg-surface px-6 shadow-card">
            <Accordion type="single" collapsible defaultValue="q-0">
              {QUESTIONS.map((item, i) => (
                <AccordionItem key={item.q} value={`q-${i}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
