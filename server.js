const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const OP = require("./models/OP");

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// Add new OP record
app.post("/api/addOP", async (req, res) => {
  console.log("📥 Received OP Data:", req.body); // <--- ADD THIS LINE
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

// Get all OPs
app.get("/api/getOPs", async (req, res) => {
  const data = await OP.find();
  res.json(data);
});

// Get dashboard counts
app.get("/api/stats", async (req, res) => {
  const total = await OP.countDocuments();
  const first = await OP.countDocuments({ status: "1st Done" });
  const second = await OP.countDocuments({ status: "2nd Done" });
  res.json({ total, first, second });
});

// Start Server
app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
