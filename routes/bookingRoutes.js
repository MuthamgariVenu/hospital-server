const express = require("express");
const {
  bookOP,
  getAllBookings,
  updateBookingStatus,
  getDashboardCounts,
} = require("../controllers/bookingController");

const router = express.Router();

/* ===============================
   🩺 PATIENT SIDE
   =============================== */
router.post("/book-op", bookOP);

/* ===============================
   👨‍⚕️ ADMIN SIDE
   =============================== */

// ✅ Fetch all OP bookings (for admin view)
router.get("/op-bookings", getAllBookings);

// ✅ Update booking status (Doctor / Report / Completed)
router.put("/update-status/:id", updateBookingStatus);

// ✅ Get live dashboard counts (Pending, Report, Completed)
router.get("/dashboard-counts", getDashboardCounts);

module.exports = router;
