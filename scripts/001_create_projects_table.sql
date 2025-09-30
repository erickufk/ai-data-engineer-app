-- Create projects table for AI Data Engineer App
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused')),
    source_preset TEXT,
    target_preset TEXT,
    source_config JSONB,
    target_config JSONB,
    field_mapping JSONB,
    schedule JSONB,
    load_mode TEXT,
    load_policy JSONB,
    pipeline_nodes JSONB,
    pipeline_edges JSONB,
    file_profile JSONB,
    recommendation JSONB,
    artifacts_preview JSONB,
    report_draft JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON public.projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on projects" ON public.projects
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.projects TO authenticated;
