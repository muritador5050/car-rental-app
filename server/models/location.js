const { pool } = require('../config/db');

//Location
class Location {
  //Create a new location (admin only)
  static async create(locationData) {
    const {
      name,
      address,
      city,
      latitude,
      longitude,
      phone_number,
      working_hours,
    } = locationData;

    try {
      const [rows] = await pool.query(
        `INSERT INTO locations (  
       name,
      address,
      city,
      latitude,
      longitude,
      phone_number,
      working_hours)
      VALUES (?,?,?,?,?,?,?)
      `,
        [
          name,
          address,
          city,
          latitude,
          longitude,
          phone_number,
          JSON.stringify(working_hours),
        ]
      );
      return rows.insertId;
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  }

  //Get all locations
  static async getAll() {
    try {
      const [rows] = await pool.query('SELECT * FROM locations ORDER BY name');
      return rows;
    } catch (error) {
      console.error('Error getting all locations:', error);
      throw error;
    }
  }

  //Get loaction by ID
  static async getByID(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM locations WHERE id = ?', [
        id,
      ]);
      if (rows[0]) {
        rows[0].working_hours = JSON.stringify(rows[0].working_hours);
      }
      return rows[0];
    } catch (error) {
      console.error('Error getting location by ID:', error);
      throw error;
    }
  }
  //Update location (admin only)
  static async update(id, locationData) {
    const {
      name,
      address,
      city,
      latitude,
      longitude,
      phone_number,
      working_hours,
    } = locationData;
    try {
      const [result] = await pool.query(
        `
                UPDATE locations SET name = ? , address = ?, city = ? , latitude = ?, longitude = ?, 
                 phone_number = ? , working_hours = ? 
                 WHERE id = ?`,
        [
          name,
          address,
          city,
          latitude,
          longitude,
          phone_number,
          JSON.stringify(working_hours),
          id,
        ]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  //Delete a location (admin only)
  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM locations WHERE id = ?', [
        id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in deleting', error);
      throw error;
    }
  }
}

module.exports = Location;
