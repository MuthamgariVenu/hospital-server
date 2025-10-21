const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();

const OP = require("./models/OP");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// ✅ Add New OP Record (your existing one)
app.post("/api/addOP", async (req, res) => {
  console.log("📥 Received OP Data:", req.body);
  try {
    const newOP = new OP(req.body);
    await newOP.save();
    console.log("✅ Saved to MongoDB:", req.body);
    res.json({ message: "OP Added Successfully" });
  } catch (error) {
    console.error("❌ Save Error:", error);
    res.status(500).json({ message: "Database Save Failed" });
  }
});

// ✅ New: Book OP + SMS Route
app.post("/api/book-op", async (req, res) => {
  try {
    const { name, number, age } = req.body;

    if (!name || !number || !age) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Generate OP number (e.g., OP20251021-123)
    const opNumber = `OP${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;

    // Estimate Doctor arrival time
    const eta = "30 minutes";

    // ✅ Save to MongoDB
    const newOP = new OP({
      patientName: name,
      patientNumber: number,
      age,
      opNumber,
      status: "Pending"
    });

    await newOP.save();

    console.log("✅ OP Saved to MongoDB:", opNumber);

    // ✅ Twilio SMS Integration
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Ashwini Neuro Super Speciality Center\nYour OP booked successfully!\nOP Number: ${opNumber}\nDoctor ETA: ${eta}\nTrack here: https://hospital-webapp.netlify.app/track-op`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${number}`
    });

    console.log("📩 SMS sent to", number);

    res.status(200).json({ success: true, opNumber, eta });
  } catch (err) {
    console.error("❌ Booking Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get all OPs
app.get("/api/getOPs", async (req, res) => {
  const data = await OP.find();
  res.json(data);
});

// ✅ Get Dashboard Stats
app.get("/api/stats", async (req, res) => {
  const total = await OP.countDocuments();
  const first = await OP.countDocuments({ status: "1st Done" });
  const second = await OP.countDocuments({ status: "2nd Done" });
  res.json({ total, first, second });
});

// ✅ Start Server
app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
