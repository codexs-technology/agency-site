-- Update pricing amounts for approved packages
-- Website Development: $499 = 49900 minor units
-- Business Applications: $1,499 = 149900 minor units
-- AI Automation Solutions: $1,999 = 199900 minor units
UPDATE pricing_packages SET amount_minor = 49900, billing = 'one_time' WHERE slug = 'starter';
UPDATE pricing_packages SET amount_minor = 149900, billing = 'one_time' WHERE slug = 'business';
UPDATE pricing_packages SET amount_minor = 199900, billing = 'one_time' WHERE slug = 'enterprise';