const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const db = new sqlite3.Database('./database.sqlite');

// Function to print all tables and their data
function printAllTablesAndData() {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('Error fetching tables:', err.message);
            return;
        }

        if (tables.length > 0) {
            console.log('Tables in the database:');
            tables.forEach((table, index) => {
                console.log(`\nTable: ${table.name}`);

                db.all(`SELECT * FROM ${table.name}`, [], (err, rows) => {
                    if (err) {
                        console.error(`Error fetching data from table ${table.name}:`, err.message);
                        return;
                    }

                    if (rows.length > 0) {
                        console.log(`Data in table ${table.name}:`);
                        console.table(rows); // Neatly prints the rows in a table format
                    } else {
                        console.log(`No data found in table ${table.name}.`);
                    }

                    // Print a separator for better readability
                    if (index === tables.length - 1) {
                        console.log("\n-----------------------------------");
                    }
                });
            });
        } else {
            console.log('No tables found in the database.');
        }
    });
}

// Call the function to print all tables and their data
printAllTablesAndData();

const app = express();

// Increase payload size limit
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function(req, file, cb) {
        const mcNumber = req.body.mcNumber;
        let newFileName = '';

        switch (file.fieldname) {
            case 'operatingAuthority':
                newFileName = `${mcNumber}_OpAuth${path.extname(file.originalname)}`;
                break;
            case 'insuranceCertificates':
                newFileName = `${mcNumber}_COIs_${file.originalname}`;
                break;
            case 'w9Form':
                newFileName = `${mcNumber}_W9${path.extname(file.originalname)}`;
                break;
            case 'insuranceCertificate':
                newFileName = `${mcNumber}_COI_${file.originalname}`;
                break;
            default:
                newFileName = file.originalname; // Fallback to original name if unrecognized field
        }

        cb(null, newFileName);
    }
});

const upload = multer({ storage: storage });
// The rest of your middleware and route handlers
app.use(bodyParser.json());


//make bd table carrier

// Create the carriers table if it doesn't exist
db.serialize(() => {
// Create the 'carriers' table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS carriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrierName TEXT,
        carrierAddress TEXT,
        carrierPhone TEXT,
        carrierFax TEXT,
        carrierEmail TEXT,
        carrierWebsite TEXT,
        mcNumber TEXT,
        dotNumber TEXT,
        fein TEXT,
        operatingAuthority TEXT,
        insuranceCertificates TEXT,
        w9Form TEXT,
        insuranceCertificate TEXT,
        insuranceAgentContact TEXT,
        insurancePolicyNumbers TEXT,
        insuranceLimits TEXT,
        safetyRating TEXT,
        csaScores TEXT,
        accidentHistory TEXT,
        driverInfo TEXT,
        bankingInfo TEXT,
        factoringCompany TEXT,
        "references" TEXT,  -- Escaped using double quotes
        equipmentTypes TEXT,
        geoAreas TEXT,
        specializations TEXT,
        fleetSize TEXT,
        yearsInBusiness TEXT,
        experience TEXT
    )
`, (err) => {
    if (err) {
        console.error("Error creating carriers table:", err.message);
    }
});
});

module.exports = db;

//----------------------------------------------------------------

// API routes for agents
app.post('/api/agents', (req, res) => {
    const { name, phone, email } = req.body;
    db.run('INSERT INTO agents (name, phone, email) VALUES (?, ?, ?)', [name, phone, email], function(err) {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.status(201).json({ id: this.lastID });
        }
    });
});

app.get('/api/agents', (req, res) => {
    db.all('SELECT * FROM agents', [], (err, rows) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/agents/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM agents WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(row);
        }
    });
});

app.put('/api/agents/:id', (req, res) => {
    const { id } = req.params;
    const { name, phone, email } = req.body;
    db.run('UPDATE agents SET name = ?, phone = ?, email = ? WHERE id = ?', [name, phone, email, id], function(err) {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.status(200).json({ changes: this.changes });
        }
    });
});

app.delete('/api/agents/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM agents WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.status(200).json({ changes: this.changes });
        }
    });
});

// API routes for loads
app.post('/api/loads', (req, res) => {
    const { load_no, customer, pick_up_count, drop_off_count, load_status, pick_ups, drop_offs } = req.body;

    console.log('Received data:', req.body);

    // Validate required fields
    if (!load_no || !customer || !pick_up_count || !drop_off_count || !load_status) {
        console.error('Missing required fields:', { load_no, customer, pick_up_count, drop_off_count, load_status });
        return res.status(400).send('Missing required fields');
    }

    // Further validation for pick_ups and drop_offs
    if (pick_ups.some(pickUp => !pickUp.address || !pickUp.city)) {
        console.error('Incomplete pick-up data:', pick_ups);
        return res.status(400).send('Pick-up location data is incomplete');
    }

    if (drop_offs.some(dropOff => !dropOff.address || !dropOff.city)) {
        console.error('Incomplete drop-off data:', drop_offs);
        return res.status(400).send('Drop-off location data is incomplete');
    }

    db.run('INSERT INTO loads (load_no, customer, pick_up_count, drop_off_count, load_status, pick_ups, drop_offs) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [load_no, customer, pick_up_count, drop_off_count, load_status, JSON.stringify(pick_ups), JSON.stringify(drop_offs)], 
        function(err) {
            if (err) {
                console.error('Error inserting load:', err.message);
                return res.status(500).send('Failed to save load. Error: ' + err.message);
            } else {
                return res.status(201).json({ id: this.lastID });
            }
        }
    );
});

app.put('/api/loads/:id', (req, res) => {
    const { id } = req.params;
    const { load_no, customer, pick_up_count, drop_off_count, load_status, pick_ups, drop_offs } = req.body;

    console.log('Updating load ID:', id);
    console.log('Incoming load update data:', req.body);

    db.run('UPDATE loads SET load_no = ?, customer = ?, pick_up_count = ?, drop_off_count = ?, load_status = ?, pick_ups = ?, drop_offs = ? WHERE id = ?', 
        [load_no, customer, pick_up_count, drop_off_count, load_status, JSON.stringify(pick_ups), JSON.stringify(drop_offs), id], 
        function(err) {
            if (err) {
                console.error('Error updating load:', err.message);
                res.status(500).send('Failed to update load.');
            } else {
                res.status(200).json({ changes: this.changes });
            }
        }
    );
});

app.get('/api/loads', (req, res) => {
    const { load_no } = req.query;
    db.get('SELECT * FROM loads WHERE load_no = ?', [load_no], (err, row) => {
        if (err) {
            res.status(500).send(err.message);
        } else if (!row) {
            res.status(404).send('Load not found');
        } else {
            // Ensure pick_ups and drop_offs are parsed as arrays
            row.pick_ups = JSON.parse(row.pick_ups || '[]');
            row.drop_offs = JSON.parse(row.drop_offs || '[]');
            res.json(row);
        }
    });
});

app.delete('/api/loads/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM loads WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.status(200).json({ changes: this.changes });
        }
    });
});

// API routes for rate confirmations

const pdf = require('html-pdf'); // Assuming you are using 'html-pdf' for PDF generation

app.post('/api/rate-confirmations', async (req, res) => {
    const { loadNo, rateConfirmationContent } = req.body;
    const pdfPath = path.join(__dirname, 'rate-confirmations', `load_${loadNo}.pdf`);

    try {
        // Generate the PDF and save it to the file system
        pdf.create(rateConfirmationContent).toFile(pdfPath, async (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error generating PDF', error: err });
            }

            // Save the rate confirmation content to the database as you already do
            let existingRateCon = await db.get('SELECT * FROM rate_confirmations WHERE load_no = ?', [loadNo]);

            if (existingRateCon) {
                await db.run('UPDATE rate_confirmations SET rate_con_content = ? WHERE load_no = ?', [rateConfirmationContent, loadNo]);
            } else {
                await db.run('INSERT INTO rate_confirmations (load_no, rate_con_content) VALUES (?, ?)', [loadNo, rateConfirmationContent]);
            }

            res.status(200).json({ message: 'Rate confirmation saved successfully' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error saving rate confirmation', error });
    }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//new to save form


app.post('/api/shippers', (req, res) => {
    const {
        addedBy, customer, industry, commodity, companyPhone, address, state, website, linkedin,
        employeeCount, logisticsManager, logisticsManagerPhone, logisticsManagerEmail,
        operationsManager, operationsManagerPhone, operationsManagerEmail,
        generalManager, generalManagerPhone, generalManagerEmail, generalContact,
        generalContactPhone, generalContactEmail, notes, source,
        consignee, bolIndustry, bolCommodity, bolCompanyPhone, bolAddress, bolState,
        bolWebsite, bolLinkedin, bolEmployeeCount, bolLogisticsManager, bolLogisticsManagerPhone,
        bolLogisticsManagerEmail, bolOperationsManager, bolOperationsManagerPhone, bolOperationsManagerEmail,
        bolGeneralManager, bolGeneralManagerPhone, bolGeneralManagerEmail, bolGeneralContact,
        bolGeneralContactPhone, bolGeneralContactEmail, bolNotes,
        reference, referencePhone, referenceEmail, referenceWebsite
    } = req.body;

    // Define the basic SQL and params
    let sql = `
        INSERT INTO shippers (
            added_by, customer, industry, commodity, company_phone, address, state, website, linkedin,
            employee_count, logistics_manager, logistics_manager_phone, logistics_manager_email,
            operations_manager, operations_manager_phone, operations_manager_email,
            general_manager, general_manager_phone, general_manager_email,
            general_contact, general_contact_phone, general_contact_email, notes, source
        `;
    let params = [
        addedBy || '', customer || '', industry || '', commodity || '', companyPhone || '', 
        address || '', state || '', website || '', linkedin || '', employeeCount || '', 
        logisticsManager || '', logisticsManagerPhone || '', logisticsManagerEmail || '', 
        operationsManager || '', operationsManagerPhone || '', operationsManagerEmail || '', 
        generalManager || '', generalManagerPhone || '', generalManagerEmail || '', 
        generalContact || '', generalContactPhone || '', generalContactEmail || '', 
        notes || '', source || ''
    ];

    // Add BOL or Reference fields based on the source
    if (source === 'BOL') {
        sql += `,
            consignee, bol_industry, bol_commodity, bol_company_phone, bol_address, bol_state,
            bol_website, bol_linkedin, bol_employee_count, bol_logistics_manager, bol_logistics_manager_phone,
            bol_logistics_manager_email, bol_operations_manager, bol_operations_manager_phone, bol_operations_manager_email,
            bol_general_manager, bol_general_manager_phone, bol_general_manager_email, bol_general_contact,
            bol_general_contact_phone, bol_general_contact_email, bol_notes
        `;
        params.push(
            consignee || '', bolIndustry || '', bolCommodity || '', bolCompanyPhone || '', bolAddress || '', bolState || '',
            bolWebsite || '', bolLinkedin || '', bolEmployeeCount || '', bolLogisticsManager || '', bolLogisticsManagerPhone || '',
            bolLogisticsManagerEmail || '', bolOperationsManager || '', bolOperationsManagerPhone || '', bolOperationsManagerEmail || '',
            bolGeneralManager || '', bolGeneralManagerPhone || '', bolGeneralManagerEmail || '', bolGeneralContact || '',
            bolGeneralContactPhone || '', bolGeneralContactEmail || '', bolNotes || ''
        );
    } else if (source === 'Reference') {
        sql += `,
            reference, reference_phone, reference_email, reference_website
        `;
        params.push(
            reference || '', referencePhone || '', referenceEmail || '', referenceWebsite || ''
        );
    }

    // Complete the SQL with VALUES placeholders
    sql += `) VALUES (${params.map(() => '?').join(', ')})`;

    // Verify parameter length
    const expectedParamsCount = sql.match(/\?/g).length;
    if (params.length !== expectedParamsCount) {
        console.error(`Expected ${expectedParamsCount} parameters, but got ${params.length}:`, params);
        return res.status(500).send('Parameter mismatch error.');
    }

    // Execute the SQL query
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).send('Failed to save shipper.');
        } else {
            res.status(201).json({ id: this.lastID });
        }
    });
});






// new shipper functions

// Get all shippers
app.get('/api/shippers', (req, res) => {
    db.all('SELECT * FROM shippers', [], (err, rows) => {
        if (err) {
            res.status(500).send('Failed to retrieve shippers.');
        } else {
            res.json(rows);
        }
    });
});

// Update shipper status
app.put('/api/shippers/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Convert the status to a boolean or integer (SQLite doesn't have a boolean type)
    const statusValue = status ? 1 : 0;

    db.run('UPDATE shippers SET status = ? WHERE id = ?', [statusValue, id], function(err) {
        if (err) {
            return res.status(500).send('Failed to update status.');
        }
        res.status(200).send('Status updated successfully.');
    });
});


// Update shipper notes
app.put('/api/shippers/:id/notes', (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    db.run('UPDATE shippers SET notes = ? WHERE id = ?', [notes, id], function(err) {
        if (err) {
            return res.status(500).send('Failed to update notes.');
        }
        res.status(200).send('Notes updated successfully.');
    });
});


// Get shipper details
app.get('/api/shippers/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM shippers WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).send('Failed to fetch shipper details.');
        }
        res.json(row);
    });
});

// Delete shipper
app.delete('/api/shippers/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM shippers WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).send('Failed to delete shipper.');
        }
        res.status(200).send('Shipper deleted.');
    });
});




//new loads table



// Get all loads

app.get('/api/all-loads', (req, res) => {
    db.all('SELECT * FROM loads', [], (err, rows) => {
        if (err) {
            console.error('Failed to retrieve loads:', err.message);
            res.status(500).send('Failed to retrieve loads.');
        } else {
            console.log('Loads data retrieved:', rows); // Log the retrieved data
            rows.forEach(row => {
                row.pick_ups = JSON.parse(row.pick_ups || '[]');
                row.drop_offs = JSON.parse(row.drop_offs || '[]');
            });
            res.json(rows);
        }
    });
});




// Get details for a single load
app.get('/api/loads/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM loads WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).send('Failed to retrieve load details.');
        } else {
            // Ensure pick_ups and drop_offs are parsed as arrays
            row.pick_ups = JSON.parse(row.pick_ups || '[]');
            row.drop_offs = JSON.parse(row.drop_offs || '[]');
            res.json(row);
        }
    });
});


// Update load status
// Update load status
app.put('/api/loads/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Convert status to integer (0 or 1)
    const statusValue = status ? 1 : 0;

    db.run('UPDATE loads SET status = ? WHERE id = ?', [statusValue, id], function(err) {
        if (err) {
            return res.status(500).send('Failed to update load status.');
        }
        res.status(200).send('Load status updated successfully.');
    });
});



// Delete a load
app.delete('/api/loads/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM loads WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).send('Failed to delete load.');
        }
        
        const pdfFilePath = path.join(__dirname, 'rate_con_files', `LoadNo_${id}.pdf`);
        if (fs.existsSync(pdfFilePath)) {
            fs.unlinkSync(pdfFilePath);
        }

        res.status(200).send('Load and associated rate confirmation deleted.');
    });
});


//test

app.get('/test-loads', (req, res) => {
    db.all('SELECT * FROM loads', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Failed to retrieve loads.');
        }
        console.log('Loads Data:', rows); // Log to console
        res.json(rows); // Send response to browser
    });
});




// Serve the rate confirmation PDF
app.get('/view-rate-con/:loadNo', (req, res) => {
    const loadNo = req.params.loadNo;
    const filePath = path.join(__dirname, 'rate-confirmations', `${loadNo}.pdf`);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File not found:', filePath);
            return res.status(404).send('Rate confirmation not found.');
        }

        // If the file exists, serve it
        res.sendFile(filePath);
    });
});


app.post('/api/save-rate-con-pdf', (req, res) => {
    const { loadNo, pdfDataUrl } = req.body;

    if (!loadNo || !pdfDataUrl) {
        return res.status(400).send('Missing load number or PDF data.');
    }

    // Convert data URL to buffer
    const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    const filePath = path.join(__dirname, 'rate-confirmations', `${loadNo}.pdf`);

    fs.writeFile(filePath, pdfBuffer, (err) => {
        if (err) {
            console.error('Failed to save PDF:', err);
            return res.status(500).send('Failed to save PDF.');
        }
        console.log('Rate confirmation PDF saved successfully as', `${loadNo}.pdf`);
        res.status(200).send('PDF saved successfully.');
    });
});


// carriers form


// API to create a new carrier with file uploads
app.post('/api/carriers', upload.fields([
    { name: 'operatingAuthority', maxCount: 1 },
    { name: 'insuranceCertificates', maxCount: 10 },
    { name: 'w9Form', maxCount: 1 },
    { name: 'insuranceCertificate', maxCount: 1 }
]), function(req, res) {
    const carrierData = req.body;
    const files = req.files;

    // Ensure MC Number is provided
    if (!carrierData.mcNumber) {
        return res.status(400).json({ error: 'MC Number is required.' });
    }

    // Check if the MC number already exists
    db.get('SELECT * FROM carriers WHERE mcNumber = ?', [carrierData.mcNumber], (err, row) => {
        if (err) {
            console.error('Error checking for duplicate MC Number:', err.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if (row) {
            // If a carrier with the same MC number is found
            return res.status(400).json({ error: 'Carrier with this MC Number already exists.' });
        }

        // If MC number is unique, proceed with the insertion
        const sql = `INSERT INTO carriers (
            carrierName, carrierAddress, carrierPhone, carrierFax, carrierEmail, carrierWebsite,
            mcNumber, dotNumber, fein, operatingAuthority, insuranceCertificates, w9Form,
            insuranceCertificate, insuranceAgentContact, insurancePolicyNumbers, insuranceLimits,
            safetyRating, csaScores, accidentHistory, driverInfo, bankingInfo, factoringCompany,
            creditReferences, equipmentTypes, geoAreas, specializations, fleetSize, carrierReferences,
            yearsInBusiness, experience
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            carrierData.carrierName, carrierData.carrierAddress, carrierData.carrierPhone, carrierData.carrierFax, carrierData.carrierEmail, carrierData.carrierWebsite,
            carrierData.mcNumber, carrierData.dotNumber, carrierData.fein,
            files.operatingAuthority ? files.operatingAuthority[0].filename : null,
            files.insuranceCertificates ? files.insuranceCertificates.map(file => file.filename).join(',') : null,
            files.w9Form ? files.w9Form[0].filename : null,
            files.insuranceCertificate ? files.insuranceCertificate[0].filename : null,
            carrierData.insuranceAgentContact, carrierData.insurancePolicyNumbers, carrierData.insuranceLimits,
            carrierData.safetyRating, carrierData.csaScores, carrierData.accidentHistory, carrierData.driverInfo,
            carrierData.bankingInfo, carrierData.factoringCompany, carrierData.creditReferences, carrierData.equipmentTypes,
            carrierData.geoAreas, carrierData.specializations, carrierData.fleetSize, carrierData.references, carrierData.yearsInBusiness,
            carrierData.experience
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error saving carrier:', err.message);
                return res.status(500).json({ error: 'Error saving carrier.' });
            } else {
                res.status(201).json({ message: 'Carrier saved successfully.', id: this.lastID });
            }
        });
    });
});




// API to retrieve all carriers
// Get all carriers
app.get('/api/carriers', (req, res) => {
    db.all('SELECT * FROM carriers', [], (err, rows) => {
        if (err) {
            console.error('Failed to retrieve carriers:', err.message);
            res.status(500).json({ error: 'Failed to retrieve carriers.' });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/carriers/:id', (req, res) => {
    const carrierId = req.params.id;

    db.get('SELECT * FROM carriers WHERE id = ?', [carrierId], (err, carrier) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve carrier details' });
        }

        if (!carrier) {
            return res.status(404).json({ error: 'Carrier not found' });
        }

        // Retrieve the list of files for this carrier based on mcNumber
        const mcNumber = carrier.mcNumber;
        const uploadsDir = path.join(__dirname, 'uploads');
        fs.readdir(uploadsDir, (err, files) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to retrieve files' });
            }

            // Filter files to include only those that start with the mcNumber
            const carrierFiles = files.filter(file => file.startsWith(mcNumber)).map(file => `/uploads/${file}`);
            
            // Return carrier details along with file links
            carrier.files = carrierFiles;
            res.json(carrier);
        });
    });
});



// API to delete a carrier
app.delete('/api/carriers/:id', (req, res) => {
    const { id } = req.params;

    // Retrieve the carrier's information first
    db.get('SELECT mcNumber FROM carriers WHERE id = ?', [id], (err, carrier) => {
        if (err) {
            return res.status(500).send('Error retrieving carrier data.');
        }

        if (!carrier) {
            return res.status(404).send('Carrier not found.');
        }

        const mcNumber = carrier.mcNumber;

        // Define file paths to delete
        const filePrefixes = ['_OpAuth', '_COIs_', '_W9', '_COI_'];
        const filesToDelete = filePrefixes.flatMap(prefix => {
            const dirPath = path.join(__dirname, 'uploads');
            return fs.readdirSync(dirPath)
                .filter(file => file.startsWith(mcNumber + prefix))
                .map(file => path.join(dirPath, file));
        });

        // Delete all matching files
        filesToDelete.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        // Delete the carrier from the database
        db.run('DELETE FROM carriers WHERE id = ?', [id], function (err) {
            if (err) {
                return res.status(500).send('Error deleting carrier.');
            }
            res.status(200).send('Carrier and associated files deleted successfully.');
        });
    });
});


app.get('/api/carriers/:mcNumber/files', (req, res) => {
    const mcNumber = req.params.mcNumber;
    const directoryPath = path.join(__dirname, 'uploads');

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Unable to scan directory:', err);
            return res.status(500).send('Unable to scan directory.');
        }

        // Filter files that start with the MC number
        const matchingFiles = files
            .filter(file => file.startsWith(mcNumber))
            .map(file => `/uploads/${file}`);

        res.json(matchingFiles);
    });
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

//login
const session = require('express-session');

// Initialize session
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 } // 1 minute for demonstration; adjust as needed
}));

// Login API route
// Login API route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (email === 'bilalkhaniazi@hotmail.com' && password === 'Gun@harm09') {
        req.session.user = email;
        res.json({ success: true });
    } else if (email === 'contact@royalstarlogistics.us' && password === 'Babajee786786') {
        req.session.user = email;
        res.json({ success: true });
    } else {
        if (email !== 'bilalkhaniazi@hotmail.com' && email !== 'contact@royalstarlogistics.us') {
            res.status(400).json({ success: false, message: 'Incorrect email.' });
        } else {
            res.status(400).json({ success: false, message: 'Incorrect password.' });
        }
    }
});



// Logout API route
// Logout API route
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to log out.' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ success: true });
    });
});

