// models/review.js
const { pool } = require('../config/db');

class Review {
  // Create a new review
  static async create(reviewData) {
    const { user_id, car_id, rating, comment } = reviewData;

    try {
      // Check if the user has actually rented this car before
      const [bookings] = await pool.query(
        `SELECT COUNT(*) as rental_count 
         FROM bookings 
         WHERE user_id = ? AND car_id = ? AND status = 'completed'`,
        [user_id, car_id]
      );

      if (bookings[0].rental_count === 0) {
        throw new Error('You can only review cars you have rented');
      }

      // Check if user has already reviewed this car
      const [existingReviews] = await pool.query(
        'SELECT id FROM reviews WHERE user_id = ? AND car_id = ?',
        [user_id, car_id]
      );

      if (existingReviews.length > 0) {
        throw new Error('You have already reviewed this car');
      }

      // Create review
      const [result] = await pool.query(
        'INSERT INTO reviews (user_id, car_id, rating, comment) VALUES (?, ?, ?, ?)',
        [user_id, car_id, rating, comment]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // Get reviews by car ID
  static async getByCarId(carId) {
    try {
      const [rows] = await pool.query(
        `SELECT r.*, u.name as user_name 
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.car_id = ?
         ORDER BY r.created_at DESC`,
        [carId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting reviews by car ID:', error);
      throw error;
    }
  }

  // Get reviews by user ID
  static async getByUserId(userId) {
    try {
      const [rows] = await pool.query(
        `SELECT r.*, c.name as car_name, c.brand as car_brand, c.model as car_model 
         FROM reviews r
         JOIN cars c ON r.car_id = c.id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting reviews by user ID:', error);
      throw error;
    }
  }

  // Get average rating for a car
  static async getAverageRating(carId) {
    try {
      const [rows] = await pool.query(
        `SELECT AVG(rating) as average_rating, COUNT(*) as review_count 
         FROM reviews 
         WHERE car_id = ?`,
        [carId]
      );

      return {
        average_rating: rows[0].average_rating || 0,
        review_count: rows[0].review_count || 0,
      };
    } catch (error) {
      console.error('Error getting average rating:', error);
      throw error;
    }
  }

  // Update a review
  static async update(id, user_id, reviewData) {
    const { rating, comment } = reviewData;

    try {
      // Verify the review belongs to the user
      const [reviews] = await pool.query(
        'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
        [id, user_id]
      );

      if (reviews.length === 0) {
        throw new Error(
          'Review not found or you do not have permission to edit it'
        );
      }

      // Update review
      const [result] = await pool.query(
        'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
        [rating, comment, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  // Delete a review
  static async delete(id, user_id) {
    try {
      // Verify the review belongs to the user or admin check can be added here
      const [result] = await pool.query(
        'DELETE FROM reviews WHERE id = ? AND user_id = ?',
        [id, user_id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }
}

module.exports = Review;
