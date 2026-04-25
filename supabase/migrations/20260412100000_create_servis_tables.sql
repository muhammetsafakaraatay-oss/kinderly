CREATE TABLE IF NOT EXISTS servis (
  id SERIAL PRIMARY KEY,
  okul_id INTEGER REFERENCES okullar(id),
  rota_adi TEXT NOT NULL,
  sofor_adi TEXT,
  arac_plaka TEXT,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servis_ogrenci (
  id SERIAL PRIMARY KEY,
  servis_id INTEGER REFERENCES servis(id),
  ogrenci_id INTEGER REFERENCES ogrenciler(id),
  yon TEXT CHECK (yon IN ('sabah', 'aksam', 'ikiyonlu'))
);
