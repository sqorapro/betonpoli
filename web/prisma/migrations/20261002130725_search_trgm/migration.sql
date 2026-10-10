-- Поиск по названию и артикулу с опечатками
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN (lower("name") gin_trgm_ops);
CREATE INDEX "Product_sku_trgm_idx" ON "Product" USING GIN (lower("sku") gin_trgm_ops);
