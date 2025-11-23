/*
  # Update GOSI Rates Configuration Documentation

  1. Changes
    - Add comments to clarify GOSI calculation base
    - Document that GOSI is calculated on Basic Salary + Housing Allowance only
    - Update function documentation

  2. Important Notes
    - GOSI contributions for both Saudi and Non-Saudi employees are calculated on:
      Basic Salary + Housing Allowance ONLY (not including transportation or other allowances)
    - Maximum wage ceiling: 45,000 SAR per month
    - Non-Saudi: 0% employee + 2% employer (occupational hazards only)
    - Saudi: 9.75% employee + 11.75% employer (full coverage)
*/

COMMENT ON TABLE gosi_rates_config IS 'Stores GOSI contribution rates per company and contributor type. GOSI is calculated on Basic Salary + Housing Allowance only, capped at max_wage_ceiling.';

COMMENT ON COLUMN gosi_rates_config.max_wage_ceiling IS 'Maximum wage base for GOSI calculation (default 45,000 SAR). GOSI calculated on Basic Salary + Housing Allowance only.';

COMMENT ON FUNCTION get_employee_gosi_rates IS 'Returns GOSI rates for an employee. Note: GOSI should be calculated on Basic Salary + Housing Allowance only, capped at max_wage_ceiling.';
