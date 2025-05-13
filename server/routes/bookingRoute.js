const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const { isAdmin, authenticateToken } = require('../utils/middlewares');

//Book a car (only auth user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      car_id,
      pickup_location_id,
      return_location_id,
      start_date,
      end_date,
    } = req.body;

    // Validate required fields
    if (
      !car_id ||
      !pickup_location_id ||
      !return_location_id ||
      !start_date ||
      !end_date
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    //Calculate price
    const priceDetails = await Booking.calculatePrice(
      car_id,
      start_date,
      end_date
    );

    // Create booking
    const bookingData = {
      user_id: req.userId,
      car_id,
      pickup_location_id,
      return_location_id,
      start_date,
      end_date,
      total_price: priceDetails.total_price,
      status: 'pending', // Default status
    };

    const bookingId = await Booking.create(bookingData);

    //Get  created booking with details
    const booking = await Booking.getById(bookingId);

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      price_details: priceDetails,
    });
  } catch (error) {
    console.error('Error in booking a car', error);
    res.status(error.message.includes('cancelled') ? 409 : 500).json({
      message: error.message || 'Error creating booking',
    });
  }
});

//Get bookings (only admin)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      userId: req.query.user_id,
      carId: req.query.car_id,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const bookings = await Booking.getAll(filters);
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

router.get('/my-booking', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.getByUserId(req.id);
    console.log(bookings);

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Error fetching your bookings' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.getById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    //Check if user is the owner or admin
    // You need to check if user has admin status from database
    const userIsAdmin = await isAdmin(req, res, () => {});

    if (booking.user_id !== req.id && !userIsAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Error fetching booking details' });
  }
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    //Valid status values
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          'Invalid status. Must be one of: pending, confirmed, cancelled, completed',
      });
    }

    //Get the booking to check ownership
    const booking = await Booking.getById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(req, res, () => {});

    //Check permission
    // if (!userIsAdmin) {

    //   if (booking.user_id !== req.id) {
    //     return res.status(403).json({ message: 'Access denied' });
    //   }

    //   if (status !== 'cancelled') {
    //     return res.status(403).json({
    //       message:
    //         'You can only cancel a booking. Contact support for other changes.',
    //     });
    //   }
    // }

    // ✅ Admin: full access to update any booking status
    if (userIsAdmin) {
      await Booking.updateStatus(bookingId, status);
      return res
        .status(200)
        .json({ message: `Booking status updated to ${status}` });
    }

    // ❌ Non-admin: only allowed to cancel their own booking
    if (booking.user_id !== req.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (status !== 'cancelled') {
      return res.status(403).json({
        message:
          'You can only cancel a booking. Contact support for other changes.',
      });
    }

    await Booking.updateStatus(bookingId, status);
    res.status(200).json({
      message: `Booking status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
});

router.get('/price-calculator', async (req, res) => {
  try {
    const { car_id, start_date, end_date } = req.query;

    if (!car_id || !start_date || !end_date) {
      return res.status(400).json({
        message: 'Car ID, start date, and end date are required',
      });
    }

    const priceDetails = await Booking.calculatePrice(
      car_id,
      start_date,
      end_date
    );

    res.status(200).json(priceDetails);
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ message: 'Error calculating price' });
  }
});

module.exports = router;
