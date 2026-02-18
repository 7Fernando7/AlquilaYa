-- Initialize FormaconIA databases and users

-- Create main application database (already created as default, so we just configure it)
\connect formacionia;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "ltree" SCHEMA public;

-- Set default search path
ALTER DATABASE formacionia SET search_path = public, contrib;

-- Grant privileges
GRANT CONNECT ON DATABASE formacionia TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;

-- Log statement for debugging
ALTER DATABASE formacionia SET log_statement = 'all';

-- Display init message
DO $$
BEGIN
  RAISE NOTICE 'FormaconIA database initialized successfully';
  RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto, pg_trgm, ltree enabled';
END $$;
