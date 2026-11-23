CREATE TABLE IF NOT EXISTS packages (
 id text PRIMARY KEY, name text NOT NULL, price integer NOT NULL CHECK(price > 0), videos text NOT NULL,
 description_uz text NOT NULL, description_ru text NOT NULL, active boolean NOT NULL DEFAULT true,
 features_uz jsonb NOT NULL DEFAULT '[]', features_ru jsonb NOT NULL DEFAULT '[]', note_uz text NOT NULL DEFAULT '', note_ru text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, username text UNIQUE NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('developer','owner','manager')));
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id integer REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS customers (id serial PRIMARY KEY, phone text UNIQUE NOT NULL, name text NOT NULL, business text NOT NULL, telegram text NOT NULL DEFAULT '', instagram text NOT NULL DEFAULT '', created_at timestamptz DEFAULT now());
CREATE SEQUENCE IF NOT EXISTS order_number_seq;
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY, number bigint UNIQUE NOT NULL DEFAULT nextval('order_number_seq'), customer_id integer REFERENCES customers(id),
 name text NOT NULL, phone text NOT NULL, business text NOT NULL, telegram text NOT NULL DEFAULT '', instagram text NOT NULL DEFAULT '', industry text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '',
 package_id text NOT NULL REFERENCES packages(id), package_name text NOT NULL, price integer NOT NULL, videos text NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','contacted','confirmed','progress','completed','cancelled')),
 delivery_status text NOT NULL DEFAULT 'pending', delivery_attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), telegram_message_id bigint,
 idempotency_key uuid UNIQUE NOT NULL, payload_hash text NOT NULL, receipt_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_delivery_idx ON orders(delivery_status,next_attempt_at);
CREATE TABLE IF NOT EXISTS order_events (id bigserial PRIMARY KEY, order_id uuid REFERENCES orders(id), actor text NOT NULL, status text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS content (id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('portfolio','review','service')), title_uz text NOT NULL, title_ru text NOT NULL, body_uz text NOT NULL DEFAULT '', body_ru text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'Reels', video_url text NOT NULL DEFAULT '', poster_url text NOT NULL DEFAULT '', source_url text UNIQUE, published boolean NOT NULL DEFAULT true, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, hits integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS app_state (key text PRIMARY KEY, value text NOT NULL);
ALTER TABLE content ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 1000000;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_details text NOT NULL DEFAULT '';
INSERT INTO packages(id,name,price,videos,description_uz,description_ru,active) VALUES
 ('start','START',99,'7','Instagram sahifasini rivojlantirishni boshlash uchun.','Для начала развития страницы в Instagram.',true),
 ('standard','STANDARD',250,'12','Brendingiz uchun barqaror video oqimi.','Стабильный поток видео для вашего бренда.',true),
 ('premium','PREMIUM',400,'17–20','Katta g‘oyalar. Ko‘proq imkoniyatlar.','Большие идеи. Больше возможностей.',true)
 ON CONFLICT DO NOTHING;
