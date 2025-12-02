-- Clean up questions with poor explanations by deleting them
-- This allows the auto-refill system to regenerate better quality questions

-- 1. Delete questions with very short explanations (less than 80 chars)
DELETE FROM questions_bank 
WHERE LENGTH(COALESCE(explanation, '')) < 80;

-- 2. Delete questions with truncated explanations (ending with incomplete patterns)
DELETE FROM questions_bank 
WHERE explanation ~ 'هو\s*$' 
   OR explanation ~ 'على\s*$' 
   OR explanation ~ 'يساوي\s*$' 
   OR explanation ~ 'أن\s*$' 
   OR explanation ~ '=\s*$' 
   OR explanation ~ '×\s*$';

-- 3. Delete questions without any justification (no "لأن" or similar)
DELETE FROM questions_bank 
WHERE explanation NOT LIKE '%لأن%'
  AND explanation NOT LIKE '%بسبب%'
  AND explanation NOT LIKE '%حيث أن%'
  AND LENGTH(explanation) > 50
  AND LENGTH(explanation) < 150;