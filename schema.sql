-- 1. Menu Items Table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Ulam', 'Kanin', 'Meryenda', 'Inumin'
    badge VARCHAR(50) DEFAULT '',
    image_url TEXT DEFAULT '',
    is_tomorrow BOOLEAN DEFAULT FALSE, -- FALSE = Today, TRUE = Tomorrow
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Guest',
    order_type VARCHAR(20) NOT NULL, -- 'Dine-in' or 'Take-out'
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INT REFERENCES menu_items(id),
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- 4. Queue Tickets Table
CREATE TABLE queue_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(20) NOT NULL, -- 'Dine-in' or 'Take-out'
    status VARCHAR(20) DEFAULT 'Waiting', -- 'Waiting', 'Serving', 'Completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table Reservations Table
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    contact_no VARCHAR(50) NOT NULL,
    party_size INT NOT NULL,
    reservation_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'Confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);