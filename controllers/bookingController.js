import twilio from "twilio";
import dotenv from "dotenv";
import OP from "../models/OP.js"; // 👈 Import your OP model

dotenv.config();

/* 🧮 =========================================
   Generate short sequential OP number (OP-01, OP-02...)
   ========================================= */
let counter = 1; // fallback counter in case DB query fails

async function generateShortOPNumber() {
  try {
    // get the last OP created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const lastOP = await OP.findOne({ createdAt: { $gte: todayStart } }).sort({ createdAt: -1 });

    if (!lastOP) return "OP-01";

    const lastNum = parseInt(lastOP.opNumber?.split("-")[1]) || 0;
    const newNum = (lastNum + 1).toString().padStart(2, "0");
    return `OP-${newNum}`;
  } catch (err) {
    console.error("⚠️ OP Number generation failed, using fallback:", err);
    const newNum = (counter++).toString().padStart(2, "0");
    return `OP-${newNum}`;
  }
}

/* 🩺 =========================================
   1️⃣ PATIENT BOOKING - Twilio + MongoDB Save
   ========================================= */
export const bookOP = async (req, res) => {
  try {
    const { name, number, age, doctorName, department, time } = req.body;

    if (!name || !number || !age) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // ✅ Generate new short OP number
    const opNumber = await generateShortOPNumber();

    const formattedDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // Save booking to MongoDB
    const newOP = new OP({
      opNumber,
      patientName: name,
      doctorName: doctorName || "Not Assigned",
      department: department || "General",
      time: time || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      date: formattedDate,
      status: "Pending"
    });

    await newOP.save();

    // Example ETA
    const eta = "30 minutes";

    // Twilio SMS Setup
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Send confirmation SMS to patient
    await client.messages.create({
      body: `Ashwini Neuro Super Speciality Center\nYour OP booked successfully!\nOP Number: ${opNumber}\nDoctor ETA: ${eta}\nTrack: https://hospital-webapp.netlify.app/track-op`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${number}`,
    });

    res.status(200).json({ success: true, opNumber, eta });
  } catch (err) {
    console.error("Booking Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🧠 2️⃣ ADMIN — FETCH ALL OP BOOKINGS (Today Only)
export const getAllBookings = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const data = await OP.find({ date: today }).sort({ time: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch OP bookings" });
  }
};

// 🔁 3️⃣ ADMIN — UPDATE STATUS (Doctor / Report / Completed)
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

// 📊 4️⃣ ADMIN — DASHBOARD COUNTS (Today's Stats Only)
export const getDashboardCounts = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const opCount = await OP.countDocuments({ date: today, status: "Pending" });
    const reportCount = await OP.countDocuments({ date: today, status: "Report" });
    const completedCount = await OP.countDocuments({ date: today, status: "Completed" });

    res.json({ opCount, reportCount, completedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard counts" });
  }
};
