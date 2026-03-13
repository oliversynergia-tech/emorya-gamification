CREATE TYPE app_role AS ENUM ('admin', 'reviewer');

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX idx_user_roles_role ON user_roles(role, created_at DESC);

INSERT INTO user_roles (user_id, role, granted_by)
SELECT id, 'admin', NULL
FROM users
WHERE lower(email) IN ('oliver@emorya.com', 'auth-test-20260313@emorya.local')
ON CONFLICT (user_id, role) DO NOTHING;
