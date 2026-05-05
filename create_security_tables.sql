-- Create security_checklist_items table
CREATE TABLE IF NOT EXISTS security_checklist_items (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR NOT NULL CHECK (category IN ('LOW', 'MEDIUM', 'HIGH')),
    item_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create asset_security_checklist table
CREATE TABLE IF NOT EXISTS asset_security_checklist (
    id BIGSERIAL PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    checklist_item_id BIGINT NOT NULL REFERENCES security_checklist_items(id),
    is_checked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, checklist_item_id)
);

-- Insert LOW category items (8 items: 6 general, 2 laptop-specific)
INSERT INTO security_checklist_items (category, item_text) VALUES
('LOW', 'Gunakan password yang kuat untuk akun pengguna'),
('LOW', 'Aktifkan fitur lock screen setelah tidak aktif'),
('LOW', 'Jangan bagikan password dengan orang lain'),
('LOW', 'Update sistem operasi secara berkala'),
('LOW', 'Install antivirus dan update definisinya'),
('LOW', 'Hindari membuka email atau lampiran dari sumber tidak dikenal'),
('LOW', '[LAPTOP] Gunakan fitur tracking laptop (Find My Device)'),
('LOW', '[LAPTOP] Jangan tinggalkan laptop tanpa pengawasan di tempat umum');

-- Insert MEDIUM category items (7 items: 4 general, 1 PC-specific, 2 laptop-specific)
INSERT INTO security_checklist_items (category, item_text) VALUES
('MEDIUM', 'Gunakan VPN saat terhubung ke jaringan publik'),
('MEDIUM', 'Aktifkan firewall pada perangkat'),
('MEDIUM', 'Backup data penting secara berkala'),
('MEDIUM', 'Gunakan two-factor authentication (2FA)'),
('MEDIUM', '[PC] Kunci komputer saat meninggalkan meja kerja'),
('MEDIUM', '[LAPTOP] Gunakan tas khusus untuk membawa laptop'),
('MEDIUM', '[LAPTOP] Hindari menggunakan laptop di tempat dengan WiFi publik tanpa VPN');

-- Insert HIGH category items (5 items: all general)
INSERT INTO security_checklist_items (category, item_text) VALUES
('HIGH', 'Laporkan segera jika perangkat hilang atau dicuri'),
('HIGH', 'Jangan install software dari sumber tidak terpercaya'),
('HIGH', 'Gunakan encryption untuk data sensitif'),
('HIGH', 'Laporkan aktivitas mencurigakan pada perangkat'),
('HIGH', 'Ikuti pelatihan keamanan informasi yang disediakan perusahaan');

-- Disable RLS for these tables (if needed for development)
ALTER TABLE security_checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_security_checklist DISABLE ROW LEVEL SECURITY;