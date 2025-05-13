const { pool } = require('../config/db');

class Booking {
  // Create a new booking
  static async create(bookingData) {
    const {
      user_id,
      car_id,
      pickup_location_id,
      return_location_id,
      start_date,
      end_date,
      total_price,
      status = 'pending',
    } = bookingData;

    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Check if car is available for the requested dates
        const [carAvailability] = await connection.query(
          `SELECT COUNT(*) as conflict_count 
           FROM bookings 
           WHERE car_id = ? 
           AND ((start_date <= ? AND end_date >= ?) 
           OR (start_date <= ? AND end_date >= ?) 
           OR (start_date >= ? AND end_date <= ?))
           AND status IN ('confirmed', 'pending')`,
          [
            car_id,
            end_date,
            start_date,
            start_date,
            end_date,
            start_date,
            end_date,
          ]
        );
        if (carAvailability[0].conflict_count > 0) {
          throw new Error('Car is not available for the selected dates');
        }

        // Create the booking record
        const [result] = await connection.query(
          `INSERT INTO bookings 
          (user_id, car_id, pickup_location_id, return_location_id, start_date, end_date, total_price, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            car_id,
            pickup_location_id,
            return_location_id,
            start_date,
            end_date,
            total_price,
            status,
          ]
        );

        // Update car status to 'booked' if booking is confirmed immediately
        if (status === 'confirmed') {
          await connection.query('UPDATE cars SET status = ? WHERE id = ?', [
            'booked',
            car_id,
          ]);
        }

        await connection.commit();
        return result.insertId;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Get all bookings with filters (admin only)
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT b.*, 
        c.name AS car_name, c.brand AS car_brand, c.model AS car_model,
        u.name AS user_name, u.email AS user_email,
        pl.name AS pickup_location_name,
        rl.name AS return_location_name
        FROM bookings b
        JOIN cars c ON b.car_id = c.id
        JOIN users u ON b.user_id = u.id
        JOIN locations pl ON b.pickup_location_id = pl.id
        JOIN locations rl ON b.return_location_id = rl.id
        WHERE 1=1
      `;

      const params = [];

      // Validate and add filters
      if (filters.status) {
        query += ' AND b.status = ?';
        params.push(filters.status);
      }

      if (filters.startDate) {
        query += ' AND b.start_date >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND b.end_date <= ?';
        params.push(filters.endDate);
      }

      if (filters.userId) {
        query += ' AND b.user_id = ?';
        params.push(parseInt(filters.userId) || filters.userId);
      }

      if (filters.carId) {
        query += ' AND b.car_id = ?';
        params.push(parseInt(filters.carId) || filters.carId);
      }

      query += ' ORDER BY b.created_at DESC';

      // Add pagination
      if (filters.limit) {
        const limit = parseInt(filters.limit);
        if (!isNaN(limit)) {
          query += ' LIMIT ?';
          params.push(limit);

          if (filters.offset) {
            const offset = parseInt(filters.offset);
            if (!isNaN(offset)) {
              query += ' OFFSET ?';
              params.push(offset);
            }
          }
        }
      }

      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting all bookings:', error);
      throw error;
    }
  }

  // Get booking by ID with related information
  static async getById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT b.*, 
         c.name AS car_name, c.brand AS car_brand, c.model AS car_model, c.image_url AS car_image,
         u.name AS user_name, u.email AS user_email,
         pl.name AS pickup_location_name, pl.address AS pickup_address,
         rl.name AS return_location_name, rl.address AS return_address
         FROM bookings b
         JOIN cars c ON b.car_id = c.id
         JOIN users u ON b.user_id = u.id
         JOIN locations pl ON b.pickup_location_id = pl.id
         JOIN locations rl ON b.return_location_id = rl.id
         WHERE b.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting booking by ID:', error);
      throw error;
    }
  }
  static async getByUserId(id) {
    try {
      const [rows] = await pool.query(
        `SELECT b.*, 
         c.name AS car_name, c.brand AS car_brand, c.model AS car_model, c.image_url AS car_image,
         pl.name AS pickup_location_name,
         rl.name AS return_location_name
         FROM bookings b
         JOIN cars c ON b.car_id = c.id
         JOIN locations pl ON b.pickup_location_id = pl.id
         JOIN locations rl ON b.return_location_id = rl.id
         WHERE b.user_id = ?
         ORDER BY b.created_at DESC`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting bookings by user ID:', error);
      throw error;
    }
  }

  // Update booking status
  static async updateStatus(id, status) {
    try {
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // Get the booking to access car ID
        const [bookings] = await connection.query(
          'SELECT * FROM bookings WHERE id = ?',
          [id]
        );
        const booking = bookings[0];

        if (!booking) {
          throw new Error('Booking not found');
        }

        // Update booking status
        await connection.query('UPDATE bookings SET status = ? WHERE id = ?', [
          status,
          id,
        ]);

        // Update car status based on booking status
        if (status === 'confirmed') {
          await connection.query('UPDATE cars SET status = ? WHERE id = ?', [
            'booked',
            booking.car_id,
          ]);
        } else if (status === 'completed' || status === 'cancelled') {
          await connection.query('UPDATE cars SET status = ? WHERE id = ?', [
            'available',
            booking.car_id,
          ]);
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  // Calculate booking price
  static async calculatePrice(carId, startDate, endDate) {
    try {
      // Get car rates
      const [carRows] = await pool.query(
        'SELECT daily_rate, hourly_rate FROM cars WHERE id = ?',
        [carId]
      );

      if (!carRows.length) {
        throw new Error('Car not found');
      }

      const { daily_rate, hourly_rate } = carRows[0];

      // Calculate number of days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calculate total price (minimum 1 day)
      const days = Math.max(1, diffDays);
      const totalPrice = daily_rate * days;

      return {
        daily_rate,
        days,
        total_price: totalPrice,
      };
    } catch (error) {
      console.error('Error calculating booking price:', error);
      throw error;
    }
  }
}

module.exports = Booking;
