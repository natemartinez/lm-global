-- Migration 0002: Create books, orders, users, and mailing list tables

CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    price_cents INTEGER NOT NULL,
    stripe_price_id TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    cover_image TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending',
    download_token TEXT UNIQUE,
    download_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    fulfilled_at TEXT,
    FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    is_subscribed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS mailing_list_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT '',
    user_id INTEGER,
    source TEXT DEFAULT 'signup',
    is_active INTEGER DEFAULT 1,
    subscribed_at TEXT DEFAULT (datetime('now')),
    unsubscribed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed the two books
INSERT INTO books (title, slug, description, price_cents, stripe_price_id, pdf_path, cover_image)
VALUES
    ('Fear No More!', 'fear-no-more', 'Demolish internal anxiety and step into bold spiritual power. Pastor Lee Martinez delivers a prophetic mandate detailing how to live fearlessly under the shield of divine authority.', 1499, '', 'books/fear-no-more.pdf', 'Adobe Express - file (1).png'),
    ('There''s Levels To This', 'theres-levels-to-this', 'Understand the systematic process of spiritual ascension. Transition from raw anointing into official, authorized, and strategic kingdom administration.', 1499, '', 'books/theres-levels-to-this.pdf', 'Adobe Express - file.png');
