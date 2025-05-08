const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dbConfig = require('../config/db.config');

//Create connection pool
const pool = mysql.createPool(dbConfig);

const Customer = {
  //Create a new customer
  create: async (customerData) => {
    try {
      const hashedPassword = await bcrypt.hash(customerData.password, 10);
      const [result] = await pool.query(
        'INSERT INTO customers(name,email,password)'
      );
    } catch (error) {}
  },
};
