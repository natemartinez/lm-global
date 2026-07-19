-- Migration 0003: Update book title "Fear No More!" -> "Fear! No More."
-- Slug stays the same: 'fear-no-more'

UPDATE books
SET title = 'Fear! No More.'
WHERE slug = 'fear-no-more';
