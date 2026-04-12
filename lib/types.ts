export interface Okul {
  id: number
  ad: string
  slug: string
  logo_url?: string
  telefon?: string
  adres?: string
  plan?: string
  plan_bitis?: string
  sifre?: string
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
  veli_ad?: string
  veli_telefon?: string
  veli2_ad?: string
  veli2_telefon?: string
  aktif?: boolean
  kayit_tarihi?: string
}

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
  ogrenciler?: { ad_soyad: string; veli_ad: string; veli_telefon: string }
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
