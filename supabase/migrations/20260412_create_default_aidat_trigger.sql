CREATE OR REPLACE FUNCTION create_default_aidat()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO aidatlar (okul_id, ogrenci_id, donem, tutar, odendi)
  VALUES (
    NEW.okul_id,
    NEW.id,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    0,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_aidat ON ogrenciler;

CREATE TRIGGER trigger_create_aidat
AFTER INSERT ON ogrenciler
FOR EACH ROW EXECUTE FUNCTION create_default_aidat();
