/*
  # Seed Nitaqat Sectors and Band Thresholds

  ## Overview
  Seeds the database with:
  1. Three main sectors: Trading, Manufacturing, and Tourism
  2. Size bands for each sector (based on actual Saudi Nitaqat regulations)
  3. Color bands with percentage thresholds for each size band

  ## Sectors Included
  1. **Trading Company** (Commercial/Retail sector)
  2. **Manufacturing** (Industrial/Production sector)
  3. **Travel & Tourism** (Hospitality and tourism sector)

  ## Size Bands (Typical Saudi Classification)
  - Small: 1-9 employees
  - Small-A: 1-5 employees (uses immediate calculation)
  - Medium: 10-49 employees
  - Large: 50-499 employees
  - Very Large: 500-2999 employees
  - Giant: 3000+ employees

  ## Color Bands
  - **Red**: Below minimum requirement (non-compliant)
  - **Yellow**: Minimum requirement (compliant but at risk)
  - **Low Green**: Above minimum (stable)
  - **Mid Green**: Good performance
  - **High Green**: Excellent performance
  - **Platinum**: Outstanding performance

  Note: Percentages are approximate and based on typical Saudi Nitaqat thresholds.
  These can be adjusted based on official HRSD data.
*/

-- Insert Sectors
INSERT INTO nitaqat_sectors (id, name_en, name_ar, code, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Trading Company', 'الشركات التجارية', 'TRADING', 'Commercial and retail trading establishments'),
  ('a0000000-0000-0000-0000-000000000002', 'Manufacturing', 'التصنيع', 'MANUFACTURING', 'Industrial manufacturing and production facilities'),
  ('a0000000-0000-0000-0000-000000000003', 'Travel & Tourism', 'السياحة والسفر', 'TOURISM', 'Travel agencies, tourism services, and hospitality')
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- TRADING COMPANY SECTOR - Size Bands
-- ===========================================

-- Small-A (1-5 employees) - Immediate calculation
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Small-A', 1, 5, true)
ON CONFLICT DO NOTHING;

-- Small (6-9 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Small', 6, 9, false)
ON CONFLICT DO NOTHING;

-- Medium (10-49 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Medium', 10, 49, false)
ON CONFLICT DO NOTHING;

-- Large (50-499 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0001-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Large', 50, 499, false)
ON CONFLICT DO NOTHING;

-- Very Large (500-2999 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0001-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Very Large', 500, 2999, false)
ON CONFLICT DO NOTHING;

-- Giant (3000+ employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0001-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Giant', 3000, NULL, false)
ON CONFLICT DO NOTHING;

-- ===========================================
-- TRADING - Medium Size (10-49) Bands
-- ===========================================
INSERT INTO nitaqat_bands (size_band_id, band_name, band_color, min_percentage, max_percentage, priority) VALUES
  ('b0000000-0000-0000-0001-000000000003', 'Red', '#ef4444', 0.00, 11.99, 1),
  ('b0000000-0000-0000-0001-000000000003', 'Yellow', '#eab308', 12.00, 16.99, 2),
  ('b0000000-0000-0000-0001-000000000003', 'Low Green', '#84cc16', 17.00, 22.99, 3),
  ('b0000000-0000-0000-0001-000000000003', 'Mid Green', '#22c55e', 23.00, 29.99, 4),
  ('b0000000-0000-0000-0001-000000000003', 'High Green', '#10b981', 30.00, 39.99, 5),
  ('b0000000-0000-0000-0001-000000000003', 'Platinum', '#a855f7', 40.00, 100.00, 6)
ON CONFLICT DO NOTHING;

-- ===========================================
-- TRADING - Large Size (50-499) Bands
-- ===========================================
INSERT INTO nitaqat_bands (size_band_id, band_name, band_color, min_percentage, max_percentage, priority) VALUES
  ('b0000000-0000-0000-0001-000000000004', 'Red', '#ef4444', 0.00, 9.99, 1),
  ('b0000000-0000-0000-0001-000000000004', 'Yellow', '#eab308', 10.00, 14.99, 2),
  ('b0000000-0000-0000-0001-000000000004', 'Low Green', '#84cc16', 15.00, 19.99, 3),
  ('b0000000-0000-0000-0001-000000000004', 'Mid Green', '#22c55e', 20.00, 26.99, 4),
  ('b0000000-0000-0000-0001-000000000004', 'High Green', '#10b981', 27.00, 36.99, 5),
  ('b0000000-0000-0000-0001-000000000004', 'Platinum', '#a855f7', 37.00, 100.00, 6)
ON CONFLICT DO NOTHING;

-- ===========================================
-- MANUFACTURING SECTOR - Size Bands
-- ===========================================

-- Small-A (1-5 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Small-A', 1, 5, true)
ON CONFLICT DO NOTHING;

-- Small (6-9 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0002-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Small', 6, 9, false)
ON CONFLICT DO NOTHING;

-- Medium (10-49 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0002-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Medium', 10, 49, false)
ON CONFLICT DO NOTHING;

-- Large (50-499 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0002-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Large', 50, 499, false)
ON CONFLICT DO NOTHING;

-- Very Large (500-2999 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0002-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Very Large', 500, 2999, false)
ON CONFLICT DO NOTHING;

-- Giant (3000+ employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0002-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Giant', 3000, NULL, false)
ON CONFLICT DO NOTHING;

-- ===========================================
-- MANUFACTURING - Medium Size (10-49) Bands
-- ===========================================
INSERT INTO nitaqat_bands (size_band_id, band_name, band_color, min_percentage, max_percentage, priority) VALUES
  ('b0000000-0000-0000-0002-000000000003', 'Red', '#ef4444', 0.00, 6.99, 1),
  ('b0000000-0000-0000-0002-000000000003', 'Yellow', '#eab308', 7.00, 10.99, 2),
  ('b0000000-0000-0000-0002-000000000003', 'Low Green', '#84cc16', 11.00, 15.99, 3),
  ('b0000000-0000-0000-0002-000000000003', 'Mid Green', '#22c55e', 16.00, 21.99, 4),
  ('b0000000-0000-0000-0002-000000000003', 'High Green', '#10b981', 22.00, 29.99, 5),
  ('b0000000-0000-0000-0002-000000000003', 'Platinum', '#a855f7', 30.00, 100.00, 6)
ON CONFLICT DO NOTHING;

-- ===========================================
-- MANUFACTURING - Large Size (50-499) Bands
-- ===========================================
INSERT INTO nitaqat_bands (size_band_id, band_name, band_color, min_percentage, max_percentage, priority) VALUES
  ('b0000000-0000-0000-0002-000000000004', 'Red', '#ef4444', 0.00, 5.99, 1),
  ('b0000000-0000-0000-0002-000000000004', 'Yellow', '#eab308', 6.00, 9.99, 2),
  ('b0000000-0000-0000-0002-000000000004', 'Low Green', '#84cc16', 10.00, 13.99, 3),
  ('b0000000-0000-0000-0002-000000000004', 'Mid Green', '#22c55e', 14.00, 19.99, 4),
  ('b0000000-0000-0000-0002-000000000004', 'High Green', '#10b981', 20.00, 27.99, 5),
  ('b0000000-0000-0000-0002-000000000004', 'Platinum', '#a855f7', 28.00, 100.00, 6)
ON CONFLICT DO NOTHING;

-- ===========================================
-- TOURISM SECTOR - Size Bands
-- ===========================================

-- Small-A (1-5 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0003-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Small-A', 1, 5, true)
ON CONFLICT DO NOTHING;

-- Small (6-9 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0003-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Small', 6, 9, false)
ON CONFLICT DO NOTHING;

-- Medium (10-49 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0003-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Medium', 10, 49, false)
ON CONFLICT DO NOTHING;

-- Large (50-499 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0003-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Large', 50, 499, false)
ON CONFLICT DO NOTHING;

-- Very Large (500-2999 employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0003-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Very Large', 500, 2999, false)
ON CONFLICT DO NOTHING;

-- Giant (3000+ employees)
INSERT INTO nitaqat_size_bands (id, sector_id, name, min_employees, max_employees, uses_immediate_calculation) VALUES
  ('b0000000-0000-0000-0003-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Giant', 3000, NULL, false)
ON CONFLICT DO NOTHING;

-- ===========================================
-- TOURISM - Medium Size (10-49) Bands
-- ===========================================
INSERT INTO nitaqat_bands (size_band_id, band_name, band_color, min_percentage, max_percentage, priority) VALUES
  ('b0000000-0000-0000-0003-000000000003', 'Red', '#ef4444', 0.00, 13.99, 1),
  ('b0000000-0000-0000-0003-000000000003', 'Yellow', '#eab308', 14.00, 19.99, 2),
  ('b0000000-0000-0000-0003-000000000003', 'Low Green', '#84cc16', 20.00, 26.99, 3),
  ('b0000000-0000-0000-0003-000000000003', 'Mid Green', '#22c55e', 27.00, 34.99, 4),
  ('b0000000-0000-0000-0003-000000000003', 'High Green', '#10b981', 35.00, 44.99, 5),
  ('b0000000-0000-0000-0003-000000000003', 'Platinum', '#a855f7', 45.00, 100.00, 6)
ON CONFLICT DO NOTHING;

-- ===========================================
-- TOURISM - Large Size (50-499) Bands
-- ===========================================
INSERT INTO nitaqat_bands (size_band_id, band_name, band_color, min_percentage, max_percentage, priority) VALUES
  ('b0000000-0000-0000-0003-000000000004', 'Red', '#ef4444', 0.00, 11.99, 1),
  ('b0000000-0000-0000-0003-000000000004', 'Yellow', '#eab308', 12.00, 17.99, 2),
  ('b0000000-0000-0000-0003-000000000004', 'Low Green', '#84cc16', 18.00, 23.99, 3),
  ('b0000000-0000-0000-0003-000000000004', 'Mid Green', '#22c55e', 24.00, 31.99, 4),
  ('b0000000-0000-0000-0003-000000000004', 'High Green', '#10b981', 32.00, 41.99, 5),
  ('b0000000-0000-0000-0003-000000000004', 'Platinum', '#a855f7', 42.00, 100.00, 6)
ON CONFLICT DO NOTHING;
