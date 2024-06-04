var express = require('express');
var https = require('node:https');
var mysql = require('mysql');

// RDS Connection Credentials
var db = mysql.createConnection({
    host: "database-1.cleovrzmw7r9.us-east-2.rds.amazonaws.com",
    port: "3306",
    user: "admin",
    password: "burhanis2good",
    database: "nutrisyncdb",
});

// Establishing Connection w/ RDS
db.connect((err) => {
    if (err) {
        console.log("Error establishing connecting with RDS Instance");
        return;
    }
    console.log("Successful connection with RDS isntance");
});

// Initialize Express App
var app = express();

// Login Authenticaion
app.get('/login', function (req, res) {
    const username = req.query.username;
    const password = req.query.password;

    const sql = 'SELECT user_id FROM user_list WHERE user_name = ? AND user_pword = ?';
    db.query(sql, [username, password], (error, results, fields) => {
        if (error) {
            console.log(error);
            mySqlClient.end();
            res.status(500).send("SQL QUERY FAILED");
            res.end();
        }

        if (results.length > 0) {
            res.send("SUCCESSFUL LOGIN");
        } else {
            res.status(500).send("USER NOT FOUND");
        }

        db.end();
    });
});

// Signup Authentication
app.get('/signup', function (req, res) {
    const email = req.query.email;
    const password = req.query.password;
    const username = req.query.username;

    const sql = 'SELECT user_id FROM user_list WHERE user_email = ?';
    db.query(sql, [email], (error, results, fields) => {
        if (error) {
            console.log(error);
            res.status(500).send("ERROR 500: INTERNAL SERVER ERROR; SQL QUERY FAILED");
            db.end();
            res.end();
        }

        if (results.length > 0) {
            res.send("EMAIL ALREADY IN USE");
        }

        db.end();
        res.end();
    });

    sql = 'INSERT INTO user_list (user_name, user_calorie_goal, user_pwrd, user_email) VALUES ?';
    values = [username, 2000, password, email];

    db.query(sql, values, (error, results, fields) => {
        if (error) {
            console.log(error);
            res.status(500).send("SQL QUERY FAILED");
            db.end();
            res.end();
        }

        db.end();
    });
})

// Setting User Goals Data 
app.get('/setgoal', function (req, res) {
    const goal = req.query.goal;
    const user = req.query.username;

    const sql = 'UPDATE user_list SET user_calorie_goal = ? WHERE user_name = ?';
    db.query(sql, [goal, user], (error, results, fields) => {
        if (error) {
            console.log(error);
            mySqlClient.end();
            res.status(500).send("SQL ERROR: COULD NOT UPDATE USER CALORIE GOAL");
            res.end();
        }

        res.send("SUCCESSFUL UPDATE OF USER CALORIE GOAL");
        db.end();
    });
})

// Retrieve User Goals Data
app.get('/getgoal', function (req, res) {
    const user = req.query.username;
    const sql = 'SELECT user_calorie_goal FROM user_list WHERE user_name = ?';

    db.query(sql, [user], (error, results, fields) => {
        if (error) {
            console.log(error);
            mySqlClient.end();
            res.status(500).send("SQL ERROR: COULD NOT QUERY USER CALORIE GOAL DATA");
            res.end();
        }

        res.send(results);
        db.end();
    });
})

// Update Daily Log
app.get('/updatelog', function (req, res) {
    const username = req.query.username;
    const date = req.query.date;
    const fooditem = req.query.fooditem;
    const calories = req.query.calories;
    const protein = req.query.protein;
    const carbs = req.query.carbs;
    const fat = req.query.fat;

    const sql = 'INSERT INTO daily_log (user_name, user_calorie_goal, user_pwrd, user_email) VALUES ?';
    values = [];

    db.query(sql, [user], (error, results, fields) => {
        if (error) {
            console.log(error);
            mySqlClient.end();
            res.status(500).send("SQL ERROR: COULD NOT QUERY USER CALORIE GOAL DATA");
            res.end();
        }

        res.send(results);
        db.end();
    });
})

// Retrieve Daily Log s
app.get('/getlog', function (req, res) {
    const username = req.query.username;
    const sql = 'SELECT * FROM daily_log WHERE user_name = ?';

    db.query(sql, [username], (error, results, fields) => {
        if (error) {
            console.log(error);
            mySqlClient.end();
            res.status(500).send("SQL ERROR: COULD NOT QUERY USER CALORIE LOG");
            res.end();
        }

        res.send(results);
        db.end();
    });
})

// Helper function for HTTPS REQUEST to FDC API
async function lookup(keyword, pageNum, size) {
    return new Promise((resolve, reject) => {
        let data = '';

        const options = {
            host: 'api.nal.usda.gov',
            path: '/fdc/v1/foods/search?api_key=SNg6e0kI9K0QyFsvlajEAohNqfdWyqE1eGQ6RbWi&search='
                + keyword + '&pageNumber=' + pageNum + '&pageSize=' + size,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            // Update data on retrieval
            res.on('data', (chunk) => {
                data += chunk;
            });

            // Ending the response
            res.on('end', () => {
                console.log('Body:', data);
                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.log('Error: ', err);
            reject(err);
        });

        req.end();
    });
};

// Retrieve Food Data Through Keyword
app.get('/lookup', async function (req, res) {
    try {
        const data = await lookup(req.query.keyword, req.query.pageNum, req.query.size);
        res.send(data);
    } catch (err) {
        res.status(400).send("ERROR 400: BAD REQUEST");
        console.log(err);
    }
})

// Helper function for HTTPS REQUEST to OpenFoodFacts API
async function barcodeReq(barcode) {
    return new Promise((resolve, reject) => {
        let data = '';

        const options = {
            host: 'world.openfoodfacts.org',
            path: '/api/v0/product/' + barcode + '.json',
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            // Update data on retrieval
            res.on('data', (chunk) => {
                data += chunk;
            });

            // Ending the response
            res.on('end', () => {
                console.log('Body:', data);
                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.log('Error: ', err);
            reject(err);
        });

        req.end();
    });
};

// Data Fetching from USDA API
app.get('/barcode', async function (req, res) {
    try {
        const data = await barcodeReq(req.query.barcode);
        res.send(data);
    } catch (err) {
        res.status(400).send("ERROR 400: BAD REQUEST");
        console.log(err);
    }
})

app.listen(3000)
