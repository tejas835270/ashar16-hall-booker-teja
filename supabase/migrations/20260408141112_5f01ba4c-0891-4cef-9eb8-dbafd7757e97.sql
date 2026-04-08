ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_role_check;
ALTER TABLE credentials ADD CONSTRAINT credentials_role_check CHECK (role IN ('admin', 'guard', 'viewer_admin'));
INSERT INTO credentials (username, password, role) VALUES ('Viewer_Admin', 'view123', 'viewer_admin') ON CONFLICT DO NOTHING;