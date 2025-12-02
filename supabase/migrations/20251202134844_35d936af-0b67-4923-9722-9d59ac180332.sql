-- Create question_notes table for storing user notes on questions
CREATE TABLE public.question_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_hash TEXT NOT NULL,
  exercise_id UUID REFERENCES public.daily_exercises(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index for notes with exercise_id
CREATE UNIQUE INDEX idx_question_notes_with_exercise 
  ON public.question_notes (user_id, question_hash, exercise_id) 
  WHERE exercise_id IS NOT NULL;

-- Create unique index for notes without exercise_id
CREATE UNIQUE INDEX idx_question_notes_without_exercise 
  ON public.question_notes (user_id, question_hash) 
  WHERE exercise_id IS NULL;

-- Enable RLS
ALTER TABLE public.question_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notes"
  ON public.question_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON public.question_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON public.question_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON public.question_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_question_notes_updated_at
  BEFORE UPDATE ON public.question_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();