const express = require('express');
const router = express.Router();
const Car = require('../models/car');
const { isAdmin } = require('../utils/middlewares');

// Create a new car (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const carId = await Car.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Car created successfuly',
      carId,
    });
  } catch (error) {
    console.error('Route error creating car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create car',
      error: error.message,
    });
  }
});

//Get all cars with filtering options
router.get('/', async (req, res) => {
  try {
    // Extract filter parameters from query string
    const filters = {
      name: req.query.name,
      status: req.query.status,
      brand: req.query.brand,
      seats: req.query.seats,
      year: req.query.year,
      fuel_type: req.query.fuel_type,
      minDailyRate: req.query.minDailyRate,
      maxDailyRate: req.query.maxDailyRate,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const cars = await Car.getAll(filters);
    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars,
    });
  } catch (error) {
    console.error('Route error getting cars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cars',
      error: error.message,
    });
  }
});

// Get available cars for a specific date range
router.get('/available', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    // Extract additional filters
    const filters = {
      brand: req.query.brand,
      seats: req.query.seats,
      minDailyRate: req.query.minDailyRate,
      maxDailyRate: req.query.maxDailyRate,
    };

    const availableCars = await Car.getAvailable(startDate, endDate, filters);
    res.json({
      success: true,
      count: availableCars.length,
      data: availableCars,
    });
  } catch (error) {
    console.error('Route error getting available cars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available cars',
      error: error.message,
    });
  }
});

// Get a car by ID

router.get('/:id', async (req, res) => {
  try {
    const car = await Car.getById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }

    res.json({
      success: true,
      data: car,
    });
  } catch (error) {
    console.error('Route error getting car by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch car',
      error: error.message,
    });
  }
});

// Update a car (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const updated = await Car.update(req.params.id, req.body);

    if (!updated) {
      return res
        .status(400)
        .json({ success: false, message: 'Car not found or no change made' });
    }

    res.json({ success: true, message: 'Car updated successfully' });
  } catch (error) {
    console.error('Route error updating car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update car',
      error: error.message,
    });
  }
});

// Delete a car (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const deleted = await Car.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }

    res.json({
      success: true,
      message: 'Car deleted successfully',
    });
  } catch (error) {
    console.error('Route error deleting car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete car',
      error: error.message,
    });
  }
});

router.put('/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: 'Status is required' });
    }
    const updated = await Car.updateStatus(req.params.id, status);

    if (!updated) {
      return res.status(400).json({ success: false, message: 'Car not found' });
    }

    res.json({
      success: true,
      message: `Car status updated to ${status} successfully`,
    });
  } catch (error) {
    console.error('Route error updating car status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update car status',
      error: error.message,
    });
  }
});

// Get popular cars
router.get('/popular/:limit?', async (req, res) => {
  try {
    const limit = req.params.limit || 5;
    const popularCars = Car.getPopular(parent(limit));
    res.json({
      success: true,
      count: popularCars.length,
      data: popularCars,
    });
  } catch (error) {
    console.error('Route error getting popular cars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular cars',
      error: error.message,
    });
  }
});

module.exports = router;
