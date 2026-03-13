INSERT INTO user_roles (user_id, role, granted_by)
SELECT id, 'super_admin', NULL
FROM users
WHERE email = 'oliver@emorya.com'
ON CONFLICT (user_id, role) DO NOTHING;
