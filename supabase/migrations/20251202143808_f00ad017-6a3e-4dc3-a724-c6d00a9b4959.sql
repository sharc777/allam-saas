-- Add sub_topic column to questions_bank
ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS sub_topic TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_questions_bank_sub_topic_lookup 
ON public.questions_bank(subject, sub_topic, difficulty);

-- Add question_hash column if not exists for uniqueness
ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS question_hash TEXT;

-- Create index on question_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_questions_bank_hash 
ON public.questions_bank(question_hash);

-- Update existing questions to have a hash based on question_text
UPDATE public.questions_bank 
SET question_hash = encode(sha256(question_text::bytea), 'hex')
WHERE question_hash IS NULL;