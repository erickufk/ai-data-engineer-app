-- Create projects table for storing pipeline configurations
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'error')),
  
  -- Pipeline configuration
  source_preset JSONB,
  target_preset JSONB,
  source_config JSONB,
  target_config JSONB,
  field_mapping JSONB,
  schedule JSONB,
  load_mode TEXT,
  
  -- Pipeline nodes and edges
  pipeline_nodes JSONB,
  pipeline_edges JSONB,
  
  -- Additional metadata
  file_profile JSONB,
  recommendation JSONB,
  artifacts_preview JSONB,
  report_draft TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
