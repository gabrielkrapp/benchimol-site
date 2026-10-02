# CA pública do Supabase

`prod-ca-2021.crt` é o certificado público da Supabase Root 2021 CA, obtido em 01/10/2026 pelo HTTPS oficial. Não é chave privada nem credencial. Origem: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

O URL é definido no código oficial do Studio em https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json (`ssl:certificate_url`, env=prod) e usado por `SSLConfiguration.tsx`. TLS verifica CA e hostname; nunca usar `rejectUnauthorized:false`, `sslmode=no-verify` ou `NODE_TLS_REJECT_UNAUTHORIZED=0`.

SHA256 do arquivo (1.367 bytes): `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`. Fingerprint SHA256 do certificado: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. Validade observada até 26/04/2031. Revalidar a CA pela fonte oficial antes de trocar esse arquivo; certificado recebido do servidor sozinho não constitui uma CA confiável.

Definir `SUPABASE_DB_CA_FILE=supabase/certificates/prod-ca-2021.crt` apenas nos scripts PostgreSQL que precisarem dessa cadeia. APIs HTTPS do Supabase seguem a cadeia pública normal. Leia https://supabase.com/docs/guides/platform/ssl-enforcement e https://supabase.com/docs/guides/database/psql. Nenhuma alteração de SSL Enforcement remoto foi executada, pois isso pode reiniciar o banco.
