const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
function checkDatabaseConnection() {
    db.get('SELECT 1', [], (err, row) => {
        if (err) {
            console.error('Database connection failed:', err.message);
        } else {
            console.log('Database connection successful:', row);
        }
    });
}

// Call the function to check the database connection
checkDatabaseConnection();
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT,
            email TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS loads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            load_no TEXT,
            customer TEXT,
            pick_up_count INTEGER,
            drop_off_count INTEGER,
            load_status TEXT,
            pick_ups TEXT,
            drop_offs TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS rate_confirmations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            load_no TEXT,
            rate_con_content TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS shippers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            added_by TEXT,
            customer TEXT,
            industry TEXT,
            commodity TEXT,
            company_phone TEXT,
            address TEXT,
            state TEXT,
            website TEXT,
            linkedin TEXT,
            employee_count TEXT,
            logistics_manager TEXT,
            logistics_manager_phone TEXT,
            logistics_manager_email TEXT,
            operations_manager TEXT,
            operations_manager_phone TEXT,
            operations_manager_email TEXT,
            general_manager TEXT,
            general_manager_phone TEXT,
            general_manager_email TEXT,
            general_contact TEXT,
            general_contact_phone TEXT,
            general_contact_email TEXT,
            notes TEXT,
            source TEXT,
            consignee TEXT,
            bol_industry TEXT,
            bol_commodity TEXT,
            bol_company_phone TEXT,
            bol_address TEXT,
            bol_state TEXT,
            bol_website TEXT,
            bol_linkedin TEXT,
            bol_employee_count TEXT,
            bol_logistics_manager TEXT,
            bol_logistics_manager_phone TEXT,
            bol_logistics_manager_email TEXT,
            bol_operations_manager TEXT,
            bol_operations_manager_phone TEXT,
            bol_operations_manager_email TEXT,
            bol_general_manager TEXT,
            bol_general_manager_phone TEXT,
            bol_general_manager_email TEXT,
            bol_general_contact TEXT,
            bol_general_contact_phone TEXT,
            bol_general_contact_email TEXT,
            bol_notes TEXT,
            reference TEXT,
            reference_phone TEXT,
            reference_email TEXT,
            reference_website TEXT
        )
    `);

    //carrier form

    // Add this column to the database table if it doesn't exist already
    db.run(`
    ALTER TABLE shippers ADD COLUMN new_column TEXT
`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Failed to add new column:', err.message);
        } else {
            console.log('New column added or already exists.');
        }
    });


});

db.serialize(() => {
    db.run(`DROP TABLE IF EXISTS rate_confirmations`);
    db.run(`
        CREATE TABLE rate_confirmations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            load_no TEXT,
            rate_con_content TEXT
        )
    `);
});

module.exports = db;
