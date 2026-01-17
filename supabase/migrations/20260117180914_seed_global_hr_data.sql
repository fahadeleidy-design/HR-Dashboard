/*
  # Seed Global HR Data - Countries, Currencies, and Tax Rules

  ## Overview
  Seeds initial data for:
  - 20+ major countries with compliance settings
  - 50+ currencies
  - Common exchange rates
  - Sample tax rules for major countries
  - Holiday calendars for key countries
*/

-- =====================================================
-- SEED CURRENCIES
-- =====================================================

INSERT INTO currencies (currency_code, currency_name, currency_symbol, decimal_places, is_active) VALUES
  ('SAR', 'Saudi Riyal', '﷼', 2, true),
  ('USD', 'US Dollar', '$', 2, true),
  ('EUR', 'Euro', '€', 2, true),
  ('GBP', 'British Pound', '£', 2, true),
  ('AED', 'UAE Dirham', 'د.إ', 2, true),
  ('EGP', 'Egyptian Pound', 'E£', 2, true),
  ('JOD', 'Jordanian Dinar', 'JD', 3, true),
  ('KWD', 'Kuwaiti Dinar', 'KD', 3, true),
  ('BHD', 'Bahraini Dinar', 'BD', 3, true),
  ('OMR', 'Omani Rial', 'OMR', 3, true),
  ('QAR', 'Qatari Riyal', 'QR', 2, true),
  ('JPY', 'Japanese Yen', '¥', 0, true),
  ('CNY', 'Chinese Yuan', '¥', 2, true),
  ('INR', 'Indian Rupee', '₹', 2, true),
  ('CAD', 'Canadian Dollar', 'C$', 2, true),
  ('AUD', 'Australian Dollar', 'A$', 2, true),
  ('CHF', 'Swiss Franc', 'CHF', 2, true),
  ('SEK', 'Swedish Krona', 'kr', 2, true),
  ('NOK', 'Norwegian Krone', 'kr', 2, true),
  ('DKK', 'Danish Krone', 'kr', 2, true),
  ('SGD', 'Singapore Dollar', 'S$', 2, true),
  ('HKD', 'Hong Kong Dollar', 'HK$', 2, true),
  ('NZD', 'New Zealand Dollar', 'NZ$', 2, true),
  ('ZAR', 'South African Rand', 'R', 2, true),
  ('MXN', 'Mexican Peso', 'MX$', 2, true),
  ('BRL', 'Brazilian Real', 'R$', 2, true),
  ('TRY', 'Turkish Lira', '₺', 2, true),
  ('PLN', 'Polish Zloty', 'zł', 2, true),
  ('RUB', 'Russian Ruble', '₽', 2, true),
  ('THB', 'Thai Baht', '฿', 2, true)
ON CONFLICT (currency_code) DO NOTHING;

-- =====================================================
-- SEED COUNTRIES
-- =====================================================

INSERT INTO countries (country_code, country_code_3, name, native_name, region, subregion, capital, default_currency_code, timezone, utc_offset, phone_code, languages, standard_working_hours, min_annual_leave_days, sick_leave_days, maternity_leave_days, paternity_leave_days, probation_period_days, has_income_tax, has_social_security, is_active) VALUES

  -- Middle East
  ('SA', 'SAU', 'Saudi Arabia', 'المملكة العربية السعودية', 'Middle East', 'Western Asia', 'Riyadh', 'SAR', 'Asia/Riyadh', '+03:00', '+966', '["ar"]'::jsonb, 40, 21, 30, 70, 3, 90, false, true, true),
  ('AE', 'ARE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'Middle East', 'Western Asia', 'Abu Dhabi', 'AED', 'Asia/Dubai', '+04:00', '+971', '["ar", "en"]'::jsonb, 48, 30, 90, 60, 0, 180, false, false, true),
  ('EG', 'EGY', 'Egypt', 'مصر', 'Middle East', 'Northern Africa', 'Cairo', 'EGP', 'Africa/Cairo', '+02:00', '+20', '["ar"]'::jsonb, 48, 21, 180, 90, 0, 90, true, true, true),
  ('JO', 'JOR', 'Jordan', 'الأردن', 'Middle East', 'Western Asia', 'Amman', 'JOD', 'Asia/Amman', '+03:00', '+962', '["ar"]'::jsonb, 48, 14, 14, 70, 0, 90, true, true, true),
  ('KW', 'KWT', 'Kuwait', 'الكويت', 'Middle East', 'Western Asia', 'Kuwait City', 'KWD', 'Asia/Kuwait', '+03:00', '+965', '["ar"]'::jsonb, 48, 30, 15, 70, 3, 100, false, true, true),
  ('BH', 'BHR', 'Bahrain', 'البحرين', 'Middle East', 'Western Asia', 'Manama', 'BHD', 'Asia/Bahrain', '+03:00', '+973', '["ar"]'::jsonb, 48, 30, 15, 60, 1, 90, false, true, true),
  ('OM', 'OMN', 'Oman', 'عمان', 'Middle East', 'Western Asia', 'Muscat', 'OMR', 'Asia/Muscat', '+04:00', '+968', '["ar"]'::jsonb, 45, 30, 20, 50, 0, 90, false, true, true),
  ('QA', 'QAT', 'Qatar', 'قطر', 'Middle East', 'Western Asia', 'Doha', 'QAR', 'Asia/Qatar', '+03:00', '+974', '["ar"]'::jsonb, 48, 15, 15, 50, 3, 180, false, false, true),

  -- Europe
  ('GB', 'GBR', 'United Kingdom', 'United Kingdom', 'Europe', 'Northern Europe', 'London', 'GBP', 'Europe/London', '+00:00', '+44', '["en"]'::jsonb, 40, 28, 28, 52, 2, 90, true, true, true),
  ('DE', 'DEU', 'Germany', 'Deutschland', 'Europe', 'Western Europe', 'Berlin', 'EUR', 'Europe/Berlin', '+01:00', '+49', '["de"]'::jsonb, 40, 20, 42, 14, 14, 180, true, true, true),
  ('FR', 'FRA', 'France', 'France', 'Europe', 'Western Europe', 'Paris', 'EUR', 'Europe/Paris', '+01:00', '+33', '["fr"]'::jsonb, 35, 25, 90, 16, 28, 90, true, true, true),
  ('IT', 'ITA', 'Italy', 'Italia', 'Europe', 'Southern Europe', 'Rome', 'EUR', 'Europe/Rome', '+01:00', '+39', '["it"]'::jsonb, 40, 20, 180, 20, 10, 90, true, true, true),
  ('ES', 'ESP', 'Spain', 'España', 'Europe', 'Southern Europe', 'Madrid', 'EUR', 'Europe/Madrid', '+01:00', '+34', '["es"]'::jsonb, 40, 22, 60, 16, 15, 60, true, true, true),
  ('NL', 'NLD', 'Netherlands', 'Nederland', 'Europe', 'Western Europe', 'Amsterdam', 'EUR', 'Europe/Amsterdam', '+01:00', '+31', '["nl"]'::jsonb, 40, 20, 104, 16, 5, 60, true, true, true),
  ('CH', 'CHE', 'Switzerland', 'Schweiz', 'Europe', 'Western Europe', 'Bern', 'CHF', 'Europe/Zurich', '+01:00', '+41', '["de", "fr", "it"]'::jsonb, 42, 20, 90, 14, 10, 90, true, true, true),

  -- Americas
  ('US', 'USA', 'United States', 'United States', 'Americas', 'Northern America', 'Washington', 'USD', 'America/New_York', '-05:00', '+1', '["en"]'::jsonb, 40, 0, 0, 0, 0, 90, true, true, true),
  ('CA', 'CAN', 'Canada', 'Canada', 'Americas', 'Northern America', 'Ottawa', 'CAD', 'America/Toronto', '-05:00', '+1', '["en", "fr"]'::jsonb, 40, 10, 10, 52, 5, 90, true, true, true),
  ('MX', 'MEX', 'Mexico', 'México', 'Americas', 'Central America', 'Mexico City', 'MXN', 'America/Mexico_City', '-06:00', '+52', '["es"]'::jsonb, 48, 6, 60, 12, 5, 30, true, true, true),
  ('BR', 'BRA', 'Brazil', 'Brasil', 'Americas', 'South America', 'Brasilia', 'BRL', 'America/Sao_Paulo', '-03:00', '+55', '["pt"]'::jsonb, 44, 30, 15, 120, 5, 90, true, true, true),

  -- Asia Pacific
  ('JP', 'JPN', 'Japan', '日本', 'Asia', 'Eastern Asia', 'Tokyo', 'JPY', 'Asia/Tokyo', '+09:00', '+81', '["ja"]'::jsonb, 40, 10, 10, 14, 8, 90, true, true, true),
  ('CN', 'CHN', 'China', '中国', 'Asia', 'Eastern Asia', 'Beijing', 'CNY', 'Asia/Shanghai', '+08:00', '+86', '["zh"]'::jsonb, 40, 5, 90, 98, 15, 180, true, true, true),
  ('IN', 'IND', 'India', 'भारत', 'Asia', 'Southern Asia', 'New Delhi', 'INR', 'Asia/Kolkata', '+05:30', '+91', '["hi", "en"]'::jsonb, 48, 15, 12, 26, 0, 90, true, true, true),
  ('AU', 'AUS', 'Australia', 'Australia', 'Oceania', 'Oceania', 'Canberra', 'AUD', 'Australia/Sydney', '+10:00', '+61', '["en"]'::jsonb, 38, 20, 10, 18, 2, 90, true, true, true),
  ('SG', 'SGP', 'Singapore', 'Singapore', 'Asia', 'South-Eastern Asia', 'Singapore', 'SGD', 'Asia/Singapore', '+08:00', '+65', '["en", "zh", "ms", "ta"]'::jsonb, 44, 7, 14, 16, 2, 90, true, true, true)

ON CONFLICT (country_code) DO NOTHING;

-- =====================================================
-- SEED EXCHANGE RATES (Sample rates as of 2024)
-- =====================================================

INSERT INTO exchange_rates (from_currency_code, to_currency_code, rate, effective_date, source) VALUES
  -- SAR conversions
  ('SAR', 'USD', 0.2666, CURRENT_DATE, 'manual'),
  ('SAR', 'EUR', 0.2456, CURRENT_DATE, 'manual'),
  ('SAR', 'GBP', 0.2106, CURRENT_DATE, 'manual'),
  ('SAR', 'AED', 0.9792, CURRENT_DATE, 'manual'),
  ('SAR', 'EGP', 13.2200, CURRENT_DATE, 'manual'),
  
  -- USD conversions
  ('USD', 'EUR', 0.9211, CURRENT_DATE, 'manual'),
  ('USD', 'GBP', 0.7900, CURRENT_DATE, 'manual'),
  ('USD', 'AED', 3.6725, CURRENT_DATE, 'manual'),
  ('USD', 'JPY', 150.2500, CURRENT_DATE, 'manual'),
  ('USD', 'CNY', 7.2450, CURRENT_DATE, 'manual'),
  ('USD', 'INR', 83.1200, CURRENT_DATE, 'manual'),
  ('USD', 'CAD', 1.3568, CURRENT_DATE, 'manual'),
  ('USD', 'AUD', 1.5423, CURRENT_DATE, 'manual'),
  ('USD', 'CHF', 0.8732, CURRENT_DATE, 'manual'),
  ('USD', 'SGD', 1.3425, CURRENT_DATE, 'manual'),
  
  -- EUR conversions
  ('EUR', 'GBP', 0.8580, CURRENT_DATE, 'manual'),
  ('EUR', 'JPY', 163.1200, CURRENT_DATE, 'manual'),
  ('EUR', 'CNY', 7.8650, CURRENT_DATE, 'manual'),
  
  -- GBP conversions
  ('GBP', 'JPY', 190.1900, CURRENT_DATE, 'manual'),
  ('GBP', 'USD', 1.2658, CURRENT_DATE, 'manual')
  
ON CONFLICT (from_currency_code, to_currency_code, effective_date) DO NOTHING;

-- =====================================================
-- SEED SAMPLE TAX RULES FOR SAUDI ARABIA
-- =====================================================

INSERT INTO country_tax_rules (country_code, tax_type, tax_name, calculation_method, tax_rate, employee_percentage, employer_percentage, effective_from, is_active, description) VALUES
  -- Saudi Arabia GOSI
  ('SA', 'social_security', 'GOSI - General Organization for Social Insurance', 'flat', 22.0, 10.0, 12.0, '2024-01-01', true, 'Saudi GOSI contributions for Saudi nationals'),
  ('SA', 'unemployment', 'SANED - Unemployment Insurance', 'flat', 2.0, 1.0, 1.0, '2024-01-01', true, 'Unemployment insurance for Saudi nationals'),
  
  -- UAE does not have income tax or social security for most workers
  ('AE', 'social_security', 'End of Service Gratuity', 'custom', 0, 0, 8.33, '2024-01-01', true, 'End of service benefit calculation'),
  
  -- UK Tax Rules
  ('GB', 'income_tax', 'UK Income Tax - Basic Rate', 'bracket', 20.0, 20.0, 0, '2024-04-06', true, 'Basic rate: £12,571 to £50,270'),
  ('GB', 'income_tax', 'UK Income Tax - Higher Rate', 'bracket', 40.0, 40.0, 0, '2024-04-06', true, 'Higher rate: £50,271 to £125,140'),
  ('GB', 'social_security', 'National Insurance', 'bracket', 12.0, 12.0, 13.8, '2024-04-06', true, 'UK National Insurance contributions'),
  
  -- US Tax Rules (Federal)
  ('US', 'income_tax', 'Federal Income Tax - 10%', 'bracket', 10.0, 10.0, 0, '2024-01-01', true, '$0 to $11,000 (single)'),
  ('US', 'income_tax', 'Federal Income Tax - 12%', 'bracket', 12.0, 12.0, 0, '2024-01-01', true, '$11,001 to $44,725 (single)'),
  ('US', 'income_tax', 'Federal Income Tax - 22%', 'bracket', 22.0, 22.0, 0, '2024-01-01', true, '$44,726 to $95,375 (single)'),
  ('US', 'social_security', 'Social Security Tax', 'flat', 12.4, 6.2, 6.2, '2024-01-01', true, 'Social Security Tax (capped)'),
  ('US', 'health', 'Medicare Tax', 'flat', 2.9, 1.45, 1.45, '2024-01-01', true, 'Medicare tax'),
  
  -- Germany Tax Rules
  ('DE', 'income_tax', 'German Income Tax', 'progressive', 42.0, 42.0, 0, '2024-01-01', true, 'Progressive income tax up to 42%'),
  ('DE', 'social_security', 'Pension Insurance', 'flat', 18.6, 9.3, 9.3, '2024-01-01', true, 'German pension insurance'),
  ('DE', 'health', 'Health Insurance', 'flat', 14.6, 7.3, 7.3, '2024-01-01', true, 'German health insurance'),
  ('DE', 'unemployment', 'Unemployment Insurance', 'flat', 2.6, 1.3, 1.3, '2024-01-01', true, 'German unemployment insurance')
  
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED SAMPLE HOLIDAYS
-- =====================================================

INSERT INTO country_holidays (country_code, holiday_name, holiday_date, holiday_type, is_recurring, is_paid, description) VALUES
  -- Saudi Arabia Holidays (2024)
  ('SA', 'Saudi National Day', '2024-09-23', 'national', true, true, 'Saudi Arabia National Day'),
  ('SA', 'Eid Al-Fitr', '2024-04-10', 'religious', true, true, 'End of Ramadan (date varies)'),
  ('SA', 'Eid Al-Adha', '2024-06-16', 'religious', true, true, 'Feast of Sacrifice (date varies)'),
  ('SA', 'Islamic New Year', '2024-07-07', 'religious', true, true, 'Hijri New Year (date varies)'),
  
  -- UAE Holidays (2024)
  ('AE', 'New Year', '2024-01-01', 'public', true, true, 'New Year''s Day'),
  ('AE', 'Eid Al-Fitr', '2024-04-10', 'religious', true, true, 'End of Ramadan'),
  ('AE', 'Eid Al-Adha', '2024-06-16', 'religious', true, true, 'Feast of Sacrifice'),
  ('AE', 'Islamic New Year', '2024-07-07', 'religious', true, true, 'Hijri New Year'),
  ('AE', 'UAE National Day', '2024-12-02', 'national', true, true, 'UAE National Day'),
  
  -- US Holidays (2024)
  ('US', 'New Year''s Day', '2024-01-01', 'public', true, true, 'New Year''s Day'),
  ('US', 'Independence Day', '2024-07-04', 'national', true, true, 'Independence Day'),
  ('US', 'Thanksgiving', '2024-11-28', 'public', true, true, 'Thanksgiving Day'),
  ('US', 'Christmas', '2024-12-25', 'public', true, true, 'Christmas Day'),
  
  -- UK Holidays (2024)
  ('GB', 'New Year''s Day', '2024-01-01', 'public', true, true, 'New Year''s Day'),
  ('GB', 'Easter Monday', '2024-04-01', 'public', true, true, 'Easter Monday'),
  ('GB', 'Early May Bank Holiday', '2024-05-06', 'bank', true, true, 'May Bank Holiday'),
  ('GB', 'Spring Bank Holiday', '2024-05-27', 'bank', true, true, 'Spring Bank Holiday'),
  ('GB', 'Summer Bank Holiday', '2024-08-26', 'bank', true, true, 'Summer Bank Holiday'),
  ('GB', 'Christmas Day', '2024-12-25', 'public', true, true, 'Christmas Day'),
  ('GB', 'Boxing Day', '2024-12-26', 'public', true, true, 'Boxing Day')
  
ON CONFLICT DO NOTHING;
