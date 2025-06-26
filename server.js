// const express = require("express");
// const mysql = require("mysql2");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Database Connection
// const db = mysql.createConnection({
//   host: process.env.DB_HOST || "localhost",
//   user: process.env.DB_USER || "Mobikart",
//   password: process.env.DB_PASS || "Mobikart@123",
//   database: process.env.DB_NAME || "Mobikartdb",
// });

// db.connect(err => {
//   if (err) {
//     console.error("Database connection failed: " + err.stack);
//     return;
//   }
//   console.log("Connected to MySQL database.");
// });

// // Sample API
// app.get("/users", (req, res) => {
//   db.query("SELECT * FROM users", (err, results) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(results);
//   });
// });

// // Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });



const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use('/assets/images', express.static(path.join(__dirname, 'assets/images')));
// 🛠 Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve images from assets/images
app.use('/assets/images', express.static(path.join(__dirname, 'assets/images')));

// Ensure directory exists
const uploadDir = path.join(__dirname, 'assets/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const cloudinary = require('cloudinary').v2;
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'assets/images/');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + ext);
    }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max file size
cloudinary.config({
    cloud_name: 'daaod5vz7',
    api_key: '549951862313924',
    api_secret: '4hrJQ6sybMqGhpim-I4dE615qMQ'
});

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const result = await cloudinary.uploader.upload(req.file.path);
    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: 'Cloud upload failed', details: err.message });
  }
});

// API to create a product
app.post('/api/products', async (req, res) => {
    const { name, description, price, category, stock, image_url, additionalJson } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: "Name and price are required" });
    }

    try {
        const [result] = await db.execute(
            "INSERT INTO products (name, description, price, category, stock, image_url, additionalJson) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, description, price, category, stock, image_url, JSON.stringify(additionalJson)]
        );
        res.status(201).json({ message: "Product created", productId: result.insertId });
    } catch (error) {
        console.error("Error inserting product:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// API to update a product
app.put('/api/products/:productId', async (req, res) => {
    const { productId } = req.params; // Get product ID from the request parameters
    const { name, description, price, category, stock, image_url, additionalJson } = req.body;

    // Validate the required fields (name and price)
    if (!name || !price) {
        return res.status(400).json({ error: "Name and price are required" });
    }

    try {
        // Update the product in the database
        const [result] = await db.execute(
            `UPDATE products
            SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ?, additionalJson = ?
            WHERE id = ?`,
            [name, description, price, category, stock, image_url, JSON.stringify(additionalJson), productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Respond with a success message
        res.json({ message: "Product updated successfully" });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

//api to get all product
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM products");
        res.json(rows);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// API to get product by ID
app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Api to add product to cart user_id , product_id, added_to_cart = true 
app.post('/api/cart', async (req, res) => {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
        return res.status(400).json({ error: "User ID and Product ID are required" });
    }

    try {
        // Check if the product already exists in the cart for the given user
        const [existingOrder] = await db.execute(
            "SELECT * FROM orders WHERE user_id = ? AND product_id = ?",
            [user_id, product_id]
        );

        if (existingOrder.length > 0) {
            // If the product is already in the cart, update the added_to_cart status
            await db.execute(
                "UPDATE orders SET added_to_cart = ? WHERE user_id = ? AND product_id = ?",
                [true, user_id, product_id]
            );
            return res.status(200).json({ message: "Product added to cart" });
        } else {
            // If the product is not in the cart, insert a new record
            const [result] = await db.execute(
                "INSERT INTO orders (user_id, product_id, added_to_cart) VALUES (?, ?, ?)",
                [user_id, product_id, true]
            );
            return res.status(201).json({ message: "Product added to cart", cartId: result.insertId });
        }
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Api to create order using user_id, product_id, order_date, order_status, address, city, postal_code, phone_number, card_number, expiry_date, cvv, if user_id, product_id is not present in orders table, if present update the mentioned fields

app.post('/api/orders', async (req, res) => {
    const { user_id, price, product_id, order_status, address, city, postal_code, phone_number, card_number, expiry_date, cvv, quantity } = req.body;
    const ordered = true;
    const added_to_cart = false;
    // get current date and time
    const order_date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Validate the input fields
    if (!user_id || !price || !product_id || !order_status || !address || !city || !postal_code || !phone_number || !card_number || !expiry_date || !cvv) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Check if the order already exists for the given user_id and product_id
        const [existingOrder] = await db.execute(
            "SELECT * FROM orders WHERE user_id = ? AND product_id = ?",
            [user_id, product_id]
        );

        if (existingOrder.length > 0) {
            // If the order exists, update the existing record
            await db.execute(
                "UPDATE orders SET added_to_cart = ?, price = ?, ordered = ?, order_status = ?, address = ?, city = ?, postal_code = ?, phone_number = ?, card_number = ?, expiry_date = ?, cvv = ?, order_date = ?, quantity = ? WHERE user_id = ? AND product_id = ?",
                [added_to_cart, price, ordered, order_status, address, city, postal_code, phone_number, card_number, expiry_date, cvv, order_date, quantity, user_id, product_id ]
            );

            // decreace the quantity of the product in the products table
            await db.execute(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [quantity, product_id]
            );

            return res.status(200).json({ message: "Order updated successfully" });
        } else {
            // If the order does not exist, create a new record
            const [result] = await db.execute(
                "INSERT INTO orders (user_id, product_id, price, ordered, order_status, address, city, postal_code, phone_number, card_number, expiry_date, cvv, order_date, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [user_id, product_id, price, ordered, order_status, address, city, postal_code, phone_number, card_number, expiry_date, cvv, order_date, quantity]
            );
            await db.execute(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [quantity, product_id]
            );
            return res.status(201).json({ message: "Order created successfully", orderId: result.insertId });
        }
    } catch (error) {
        console.error("Error processing order:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



//API to get all products based on ordered = true in orders table
app.get('/api/orderedProducts', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT p.*, o.* 
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.ordered = true`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// API to get cart items by user ID along with product details
app.get('/api/cart/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
        // JOIN orders and products tables to get cart items with product details
        const [rows] = await db.execute(
            `SELECT 
                o.id AS order_id,
                o.product_id,
                p.stock,
                o.added_to_cart,
                p.name AS name,
                p.price AS price,
                p.image_url AS image_url,
                p.description AS product_description
            FROM orders o
            INNER JOIN products p ON o.product_id = p.id
            WHERE o.user_id = ? AND o.added_to_cart = true`,
            [user_id]
        );

        // Return the cart items with product details
        res.json(rows);
    } catch (error) {
        console.error("Error fetching cart items:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.delete('/api/cart/:user_id/:product_id', async (req, res) => {
    const { user_id, product_id } = req.params;

    try {
        // Check if the product is in the cart and if the order is placed (ordered = true)
        const [existingOrder] = await db.execute(
            "SELECT ordered FROM orders WHERE user_id = ? AND product_id = ?",
            [user_id, product_id]
        );

        if (existingOrder.length === 0) {
            return res.status(404).json({ error: "Cart item not found" });
        }

        const orderedStatus = existingOrder[0].ordered;

        if (orderedStatus === false) {
            // If the product is not ordered, delete the record from the cart
            const [result] = await db.execute(
                "DELETE FROM orders WHERE user_id = ? AND product_id = ?",
                [user_id, product_id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Cart item not found" });
            }

            res.json({ message: "Product removed from cart" });
        } else {
            // If the product is ordered, update added_to_cart to false
            const [updateResult] = await db.execute(
                "UPDATE orders SET added_to_cart = ? WHERE user_id = ? AND product_id = ?",
                [false, user_id, product_id]
            );

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ error: "Cart item not found" });
            }

            res.json({ message: "Product removed from cart but order is placed" });
        }

    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


//api to create user
app.post('/api/users', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Name, email and password are required" });
    }

    try {
        const [result] = await db.execute(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, password, role]
        );
        res.status(201).json({ message: "User created", userId: result.insertId });
    } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//api to get all users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM users");
        res.json(rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//api to check user
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email = ? AND password = ?",
            [email, password]
        );

        if (rows.length > 0) {
            res.json({ message: "Login successful", user: rows[0] });
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (error) {
        console.error("Error checking user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Api to get user details and order details if ordered = true  
app.get('/api/get-orders', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT u.*, o.* 
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.ordered = true`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Api to update update-order-status post request id and status
app.post('/api/update-order-status', async (req, res) => {
    const { id, order_status } = req.body;

    if (!id || !order_status) {
        return res.status(400).json({ error: "ID and order status are required" });
    }

    try {
        const [result] = await db.execute(
            "UPDATE orders SET order_status = ? WHERE id = ?",
            [order_status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json({ message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Api to get total sales, total users, total products, total orders
app.get('/api/dashboard', async (req, res) => {
    try {
        const [sales] = await db.execute("SELECT SUM(price) AS total_sales FROM orders WHERE ordered = true");
        const [users] = await db.execute("SELECT COUNT(*) AS total_users FROM users");
        const [products] = await db.execute("SELECT COUNT(*) AS total_products FROM products");
        const [orders] = await db.execute("SELECT COUNT(*) AS total_orders FROM orders WHERE ordered = true");

        res.json({
            total_sales: sales[0].total_sales,
            total_users: users[0].total_users,
            total_products: products[0].total_products,
            total_orders: orders[0].total_orders
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Api to remove products by id 
app.delete('/api/products/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const [result] = await db.execute(
            "DELETE FROM products WHERE  id = ?",
            [ productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "product item not found" });
        }

        res.json({ message: "Product removed successfully" });
    } catch (error) {
        console.error("Error removing product:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Api to update product 