export interface Okul {
  id: number
  ad: string
  slug: string
  logo_url?: string
  telefon?: string
  adres?: string
  plan?: string
  plan_bitis?: string
}

export interface Sinif {
  id: number
  okul_id: number
  ad: string
  yas_grubu?: string
  kapasite?: number
  ogretmen?: string
  renk?: string
}

export interface Ogrenci {
  id: number
  okul_id: number
  ad_soyad: string
  dogum_tarihi?: string
  sinif?: string
  kan_grubu?: string
  alerjiler?: string
  ilac?: string
  adres?: string
  aciklama?: string
  aidat_tutari?: number
  baglanti_kodu?: string
  profil_foto_path?: string
  profil_foto_url?: string
  veli_ad?: string
  veli_telefon?: string
  veli2_ad?: string
  veli2_telefon?: string
  aktif?: boolean
  kayit_tarihi?: string
}

export type ContactType = 'parent' | 'family' | 'approved_pickup' | 'emergency'

export interface Personel {
  id: number
  okul_id: number
  ad_soyad: string
  rol: string
  sinif?: string
  telefon?: string
  email?: string
  aktif?: boolean
}

export interface Yoklama {
  id: number
  okul_id: number
  ogrenci_id: number
  tarih: string
  durum: string
}

export interface Aktivite {
  id: number
  okul_id: number
  ogrenci_id: number
  tarih: string
  tur: string
  detay: Record<string, unknown>
  kaydeden?: string
  veli_gosterilsin?: boolean
  olusturuldu?: string
  ogrenciler?: { ad_soyad: string }
}

export interface Aidat {
  id: number
  okul_id: number
  ogrenci_id: number
  ay: string
  donem?: string
  tutar: number
  odendi: boolean
  son_odeme?: string
  odeme_tarihi?: string
  odenen_miktar?: number
  aciklama?: string
  ogrenciler?: { ad_soyad: string; veli_ad?: string; veli_telefon?: string }
}

export interface Mesaj {
  id: number
  okul_id: number
  gonderen_tip: string
  gonderen_id: number
  alici_tip: string
  alici_id?: number
  icerik: string
  okundu: boolean
  olusturuldu: string
}

export interface GunlukRapor {
  id: number
  okul_id: number
  ogrenci_id: number
  tarih: string
  kahvalti?: string
  ogle?: string
  uyku_suresi?: string
  ruh_hali?: string
  aciklama?: string
  kaydeden?: string
}

export interface Gelisim {
  id: number
  okul_id: number
  ogrenci_id: number
  donem: string
  kategori: string
  puan: number
  not_text?: string
  tarih: string
}

export interface Servis {
  id: number
  okul_id: number
  ogrenci_id: number
  tarih: string
  durum: string
}

export interface VeliRecord {
  id: number
  okul_id: number
  ogrenci_id?: number | null
  user_id?: string | null
  ad_soyad?: string | null
  email?: string | null
  telefon?: string | null
  aktif?: boolean | null
  iliski_tipi?: ContactType | string | null
  yakinlik?: string | null
  teslim_alabilir?: boolean | null
  acil_durum_kisisi?: boolean | null
  notlar?: string | null
  davet_gonderildi_at?: string | null
  son_davet_durumu?: string | null
  teslim_pin?: string | null
  ogrenciler?: {
    id?: number | null
    ad_soyad?: string | null
    sinif?: string | null
    baglanti_kodu?: string | null
  } | null
}
