-- Audit Logs Table for AI Forsikringsguiden
-- Formål: GDPR-compliant audit logging med anonymization support

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Session & User Information
    session_id VARCHAR(255),
    user_id UUID,
    user_email VARCHAR(255),
    user_role VARCHAR(50) DEFAULT 'user',
    
    -- Action Information
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    
    -- Request Context
    method VARCHAR(10),
    url TEXT,
    user_agent TEXT,
    ip_address INET,
    request_id VARCHAR(50),
    
    -- Response Information
    status_code INTEGER,
    response_time_ms INTEGER,
    
    -- Audit Metadata
    event_type VARCHAR(50) DEFAULT 'action',
    severity VARCHAR(20) DEFAULT 'info',
    category VARCHAR(50),
    
    -- Data Changes (JSON)
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    
    -- GDPR Compliance
    is_sensitive BOOLEAN DEFAULT FALSE,
    retention_date DATE,
    anonymized_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention_date ON audit_logs(retention_date) WHERE retention_date IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_time ON audit_logs(session_id, created_at DESC);

-- Automated cleanup function for expired logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete logs past retention date
    DELETE FROM audit_logs 
    WHERE retention_date IS NOT NULL 
    AND retention_date < CURRENT_DATE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup action
    INSERT INTO audit_logs (
        action, 
        resource, 
        event_type, 
        metadata,
        created_at
    ) VALUES (
        'cleanup_expired_logs',
        'audit_logs',
        'system',
        jsonb_build_object('deleted_count', deleted_count),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize user data in audit logs
CREATE OR REPLACE FUNCTION anonymize_audit_log_user_data(log_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE audit_logs 
    SET 
        user_email = 'anonymized@example.com',
        user_agent = 'anonymized',
        ip_address = '0.0.0.0'::inet,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('anonymized', true),
        anonymized_at = NOW()
    WHERE id = log_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_logs_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own audit logs
CREATE POLICY user_audit_logs_policy ON audit_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admin users can see all audit logs
CREATE POLICY admin_audit_logs_policy ON audit_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: System can insert audit logs
CREATE POLICY system_audit_logs_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Create a view for anonymized audit logs (for reporting)
CREATE OR REPLACE VIEW audit_logs_anonymized AS
SELECT 
    id,
    session_id,
    CASE 
        WHEN anonymized_at IS NOT NULL THEN NULL
        ELSE user_id 
    END as user_id,
    CASE 
        WHEN anonymized_at IS NOT NULL THEN 'anonymized@example.com'
        ELSE user_email 
    END as user_email,
    user_role,
    action,
    resource,
    resource_id,
    method,
    url,
    CASE 
        WHEN anonymized_at IS NOT NULL THEN 'anonymized'
        ELSE user_agent 
    END as user_agent,
    CASE 
        WHEN anonymized_at IS NOT NULL THEN '0.0.0.0'::inet
        ELSE ip_address 
    END as ip_address,
    request_id,
    status_code,
    response_time_ms,
    event_type,
    severity,
    category,
    old_values,
    new_values,
    metadata,
    is_sensitive,
    retention_date,
    anonymized_at,
    created_at,
    updated_at
FROM audit_logs;

-- Sample audit log entries for testing
INSERT INTO audit_logs (
    session_id, action, resource, event_type, metadata
) VALUES 
(
    'init-session', 
    'create_audit_table', 
    'audit_logs', 
    'system',
    jsonb_build_object(
        'version', '1.0.0', 
        'description', 'Initial audit log table creation'
    )
);

COMMENT ON TABLE audit_logs IS 'GDPR-compliant audit logging for AI Forsikringsguiden';
COMMENT ON COLUMN audit_logs.retention_date IS 'Date when this log entry should be deleted for GDPR compliance';
COMMENT ON COLUMN audit_logs.anonymized_at IS 'Timestamp when user data was anonymized';
COMMENT ON COLUMN audit_logs.is_sensitive IS 'Flag to mark logs containing sensitive personal data'; 