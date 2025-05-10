const { pool } = require('../config/db');

class Payment {
  //Create a new payment
  static async create(paymentData) {
    const {
      booking_id,
      amount,
      payment_method,
      transaction_id,
      status = 'pending',
    } = paymentData;

    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        //Create payment record
        const [result] = await connection.query(
          `INSERT INTO payments
          (booking_id, amount, payment_method, transaction_id, status) 
          VALUES (?, ?, ?, ?, ?)`,
          [booking_id, amount, payment_method, transaction_id, status]
        );

        // If payment is completed, update booking status to confirmed
        if (status === 'completed') {
          await connection.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            ['confirmed', booking_id]
          );

          // Get car ID from booking
          const [bookingRows] = await connection.query(
            'SELECT car_id FROM bookings WHERE id = ?',
            [booking_id]
          );

          if (bookingRows.length > 0) {
            // Update car status to booked
            await connection.query('UPDATE cars SET status = ? WHERE id = ?', [
              'booked',
              bookingRows[0].car_id,
            ]);
          }
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
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Get payment by ID
  static async getById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT p.*, b.user_id, b.car_id, b.start_date, b.end_date, b.total_price as booking_price
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         WHERE p.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting payment by ID:', error);
      throw error;
    }
  }

  // Get payments by booking ID
  static async getByBookingId(bookingId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC',
        [bookingId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting payments by booking ID:', error);
      throw error;
    }
  }

  // Update payment status
  static async updateStatus(id, status, transactionId = null) {
    try {
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        let query = 'UPDATE payments SET status = ?';
        const params = [status];

        if (transactionId) {
          query += ', transaction_id = ?';
          params.push(transactionId);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await connection.query(query, params);

        // Get payment details to access booking ID
        const [payments] = await connection.query(
          'SELECT * FROM payments WHERE id = ?',
          [id]
        );
        const payment = payments[0];

        if (!payment) {
          throw new Error('Payment not found');
        }

        // Update booking status based on payment status
        if (status === 'completed') {
          await connection.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            ['confirmed', payment.booking_id]
          );

          // Get car ID from booking
          const [bookingRows] = await connection.query(
            'SELECT car_id FROM bookings WHERE id = ?',
            [payment.booking_id]
          );

          if (bookingRows.length > 0) {
            // Update car status to booked
            await connection.query('UPDATE cars SET status = ? WHERE id = ?', [
              'booked',
              bookingRows[0].car_id,
            ]);
          }
        } else if (status === 'refunded') {
          await connection.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            ['cancelled', payment.booking_id]
          );

          // Get car ID from booking
          const [bookingRows] = await connection.query(
            'SELECT car_id FROM bookings WHERE id = ?',
            [payment.booking_id]
          );

          if (bookingRows.length > 0) {
            // Update car status to available
            await connection.query('UPDATE cars SET status = ? WHERE id = ?', [
              'available',
              bookingRows[0].car_id,
            ]);
          }
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
      console.error('Error updating payment status:', error);
      throw error;
    }
  }
}
module.exports = Payment;
