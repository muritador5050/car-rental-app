const { pool } = require('../config/db');

class Car {
  //Create a new car (admin only)
  static async create(carData) {
    const {
      name,
      brand,
      model,
      license_plate,
      year,
      daily_rate,
      hourly_rate,
      seats,
      status,
      fuel_type,
      transmission,
      image_url,
    } = carData;

    try {
      const [result] = await pool.query(
        `INSERT INTO cars 
        (name, brand, model, license_plate,
        year, daily_rate, hourly_rate, seats,
        status, fuel_type, transmission, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          brand,
          model,
          license_plate,
          year,
          daily_rate,
          hourly_rate,
          seats,
          status,
          fuel_type,
          transmission,
          image_url,
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating car:', error);
      throw error;
    }
  }

  //Get all cars with filtering options
  static async getAll(filter = {}) {
    try {
      let query = 'SELECT * FROM cars WHERE 1=1';
      const params = [];

      //Add filters if provided
      if (filter.name) {
        query += ' AND name = ?';
        params.push(filter.name);
      }

      if (filter.status) {
        query += ' AND status = ?';
        params.push(filter.status);
      }

      if (filter.brand) {
        query += ' AND brand = ?';
        params.push(filter.brand);
      }

      if (filter.seats) {
        query += ' AND seats >= ?';
        params.push(filter.seats);
      }

      if (filter.year) {
        query += ' AND year = ?';
        params.push(filter.year);
      }

      if (filter.fuel_type) {
        query += ' AND fuel_type = ?';
        params.push(filter.fuel_type);
      }

      //Add price range filter
      if (filter.minDailyRate) {
        query += ' AND daily_rate >= ?';
        params.push(filter.minDailyRate);
      }

      if (filter.maxDailyRate) {
        query += ' AND daily_rate <= ?';
        params.push(filter.maxDailyRate);
      }

      // Safe sorting logic
      const allowedSortFields = [
        'id',
        'name',
        'brand',
        'daily_rate',
        'year',
        'created_at',
      ];

      let sortField = 'id';
      let sortOrder = 'ASC';

      if (filter.sortBy && allowedSortFields.includes(filter.sortBy)) {
        sortField = filter.sortBy;
      }

      if (
        filter.sortOrder &&
        ['asc', 'desc'].includes(filter.sortOrder.toLowerCase())
      ) {
        sortOrder = filter.sortOrder.toUpperCase();
      }

      query += ` ORDER BY ${sortField} ${sortOrder}`;

      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting cars:', error);
      throw error;
    }
  }

  //Get available cars for a specific date range
  static async getAvailable(startDate, endDate, filters = {}) {
    try {
      let query = `
             SELECT c. * FROM cars c
             WHERE c.status = 'available'
             AND c.id NOT IN (
             SELECT b.car_id FROM bookings b
             WHERE (b.start_date <= ? AND b.end_date >= ?)
             OR (b.start_date <= ? AND b.end_date >= ?)
             OR (b.start_date >= ? AND b.end_date <= ?)
             AND b.status IN ('confirmed', 'pending')
             )
            `;

      const params = [
        endDate,
        startDate,
        startDate,
        endDate,
        startDate,
        endDate,
      ];

      // Add additional filters
      if (filters.brand) {
        query += ' AND c.brand = ?';
        params.push(filters.brand);
      }

      if (filters.seats) {
        query += ' AND c.seats >= ?';
        params.push(filters.seats);
      }

      // Add price range filter
      if (filters.minDailyRate) {
        query += ' AND c.daily_rate >= ?';
        params.push(filters.minDailyRate);
      }

      if (filters.maxDailyRate) {
        query += ' AND c.daily_rate <= ?';
        params.push(filters.maxDailyRate);
      }

      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting cars:', error);
      throw error;
    }
  }

  //Get a car by ID
  static async getById(id) {
    try {
      const [rows] = await pool.query(`SELECT * FROM cars WHERE id = ?`, [id]);
      return rows[0];
    } catch (error) {}
  }

  //Update a car (admin only)
  static async updateCar(id, userData) {
    try {
      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(userData)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }

      if (fields.length === 0) {
        throw new Error('No data provided for update');
      }

      values.push(id); // Append the ID at the end for the WHERE clause

      const query = `UPDATE cars SET ${fields.join(', ')} WHERE id = ?`;

      const [result] = await pool.query(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  //Delete a car (admin only)
  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM cars WHERE id =?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting car:', error);
      throw error;
    }
  }

  //Update car status
  static async updateStatus(id, status) {
    try {
      const [result] = await pool.query(
        `UPDATE cars SET status = ? WHERE id = ?`,
        [status, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating car status:', error);
      throw error;
    }
  }

  //Get popular cars (most booked)
  static async getPopular(limit = 5) {
    try {
      const numLimit = parseInt(limit);
      const [rows] = await pool.query(
        `
        SELECT c.*, COUNT(b.id) as booking_count 
        FROM cars c
        JOIN bookings b ON c.id = b.car_id
        WHERE b.status = 'completed'
        GROUP BY c.id
        ORDER BY booking_count DESC
        LIMIT ?
      `,
        [numLimit]
      );
      return rows;
    } catch (error) {
      console.error('Error getting popular cars:', error);
      throw error;
    }
  }
}

module.exports = Car;
