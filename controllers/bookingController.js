import twilio from "twilio";
import dotenv from "dotenv";
import OP from "../models/OP.js";

dotenv.config();

/* =========================================
   🧮 Generate Daily Sequential OP Number
   ========================================= */
async function generateDailyOPNumber() {
  try {
    // Set start of today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Find the latest OP created today
    const lastOP = await OP.findOne({ createdAt: { $gte: todayStart } }).sort({ createdAt: -1 });

    if (!lastOP) {
      return "OP-01"; // first OP of the day
    }

    // Extract numeric part
    const lastNum = parseInt(lastOP.opNumber?.split("-")[1]) || 0;
    const newNum = (lastNum + 1).toString().padStart(2, "0");

    return `OP-${newNum}`;
  } catch (err) {
    console.error("⚠️ Error generating OP number:", err);
    return "OP-01";
  }
}

/* =========================================
   1️⃣ BOOK OP (Twilio + MongoDB)
   ========================================= */
export const bookOP = async (req, res) => {
  try {
    const { name, number, age, doctorName, department, time } = req.body;

    if (!name || !number || !age) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Generate new OP number
    const opNumber = await generateDailyOPNumber();

    // ✅ Use the same date format as dashboard counts
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const currentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Save to DB
    const newOP = new OP({
      opNumber,
      patientName: name,
      doctorName: doctorName || "Not Assigned",
      department: department || "General",
      time: time || currentTime,
      date: today, // ✅ consistent with dashboard count logic
      status: "Pending",
    });

    await newOP.save();

    // Send SMS via Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const eta = "30 minutes";
    await client.messages.create({
      body: `Ashwini Neuro Super Speciality Center\nYour OP booked successfully!\nOP Number: ${opNumber}\nDoctor ETA: ${eta}\nTrack: https://ashwini-hospital-git-main-muthamgari.vercel.app/track-op.html`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${number}`,
    });

    res.status(200).json({ success: true, opNumber, eta });
  } catch (err) {
    console.error("Booking Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================================
   2️⃣ FETCH ALL OP BOOKINGS (Today Only) — FIFO FIXED
   ========================================= */
export const getAllBookings = async (req, res) => {
  try {
    // Get start and end of today (midnight to 23:59)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ Fetch today's bookings in FIFO order (first in → first out)
    const data = await OP.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ createdAt: 1 }); // oldest first

    res.json(data); // ✅ send response back
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch OP bookings" });
  }
};

/* =========================================
   3️⃣ UPDATE STATUS
   ========================================= */
export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await OP.findByIdAndUpdate(req.params.id, { status });

    if (!updated) {
      return res.status(404).json({ error: "OP booking not found" });
    }

    res.json({ message: `${status} status updated successfully` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
};

/* =========================================
   4️⃣ DASHBOARD COUNTS (Today's Stats)
   ========================================= */
export const getDashboardCounts = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // ✅ Count today's records by status
    const [opCount, reportCount, completedCount] = await Promise.all([
      OP.countDocuments({ date: today, status: "Pending" }),
      OP.countDocuments({ date: today, status: "Report" }),
      OP.countDocuments({ date: today, status: "Completed" }),
    ]);

    res.json({ opCount, reportCount, completedCount });
  } catch (err) {
    console.error("Dashboard Count Error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard counts" });
  }
};
  