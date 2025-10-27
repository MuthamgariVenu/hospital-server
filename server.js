// 🌟 ASHWINI NEURO SERVER
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const twilio = require("twilio");
const OP = require("./models/OP");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err));

// ======================================================
// 🧾 1️⃣ Add New OP Record (Manual Add Option)
// ======================================================
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

// ======================================================
// 🩺 2️⃣ Book OP + Send SMS to Patient
// ======================================================
app.post("/api/book-op", async (req, res) => {
  try {
    const { name, number, age, doctorName, department, time } = req.body;

    if (!name || !number || !age) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Generate unique OP number
    const opNumber = `OP${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;

    const eta = "30 minutes";

    const newOP = new OP({
      patientName: name,
      patientNumber: number,
      doctorName: doctorName || "Not Assigned",
      department: department || "General",
      time:
        time ||
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      opNumber,
      status: "Pending",
      date: new Date(),
    });

    await newOP.save();
    console.log("✅ OP Saved:", opNumber);

    // Twilio SMS setup
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Ashwini Neuro Super Speciality Center\nYour OP booked successfully!\nOP Number: ${opNumber}\nDoctor ETA: ${eta}\nTrack: https://hospital-webapp.netlify.app/track-op`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${number}`,
    });

    console.log("📩 SMS sent to", number);
    res.status(200).json({ success: true, opNumber, eta });
  } catch (err) {
    console.error("❌ Booking Error Details:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ======================================================
// 📞 3️⃣ Test Twilio SMS Route
// ======================================================
app.get("/api/test-sms", async (req, res) => {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const msg = await client.messages.create({
      body: "Test message from Ashwini Neuro Web App 🚑",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+919963643062",
    });

    console.log("✅ SMS Sent:", msg.sid);
    res.json({ success: true, sid: msg.sid });
  } catch (error) {
    console.error("❌ Twilio Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// 🧠 4️⃣ Get All OPs
// ======================================================
app.get("/api/getOPs", async (req, res) => {
  const data = await OP.find();
  res.json(data);
});

// ======================================================
// 📊 5️⃣ Basic Stats
// ======================================================
app.get("/api/stats", async (req, res) => {
  const total = await OP.countDocuments();
  const first = await OP.countDocuments({ status: "1st Done" });
  const second = await OP.countDocuments({ status: "2nd Done" });
  res.json({ total, first, second });
});

// ======================================================
// 👨‍⚕️ 6️⃣ ADMIN ROUTES
// ======================================================
app.get("/api/admin/op-bookings", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const data = await OP.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ date: -1 });

    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching today's OPs:", err);
    res.status(500).json({ error: "Failed to fetch today's OP bookings" });
  }
});

app.put("/api/admin/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (status === "Doctor") {
      await OP.updateMany({ status: "Doctor" }, { status: "Pending" });
    }

    const consultingDoctor = "Dr. A Yugandhar Reddy";

    const updated = await OP.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(status === "Doctor" && { doctorName: consultingDoctor }),
        time: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      { new: true }
    );

    if (status === "Completed") {
      console.log(`✅ ${updated.patientName} marked as Completed`);
      const nextPatient = await OP.findOne({ status: "Pending" }).sort({ _id: 1 });
      if (nextPatient) {
        await OP.findByIdAndUpdate(nextPatient._id, {
          status: "Doctor",
          doctorName: consultingDoctor,
        });
        console.log(`🔁 Auto moved ${nextPatient.patientName} to Doctor`);
      }
    }

    res.json({ message: `${status} updated successfully`, updated });
  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ✅ Dashboard Counts
app.get("/api/admin/dashboard-counts", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const totalCount = await OP.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const opCount = await OP.countDocuments({
      status: { $in: ["Pending", "Doctor"] },
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const reportCount = await OP.countDocuments({
      status: "Report",
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const completedCount = await OP.countDocuments({
      status: "Completed",
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    res.json({ opCount, reportCount, completedCount, totalCount });
  } catch (err) {
    console.error("❌ Dashboard Count Error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard counts" });
  }
});

// ======================================================
// 🩺 7️⃣ CONSULTING QUEUE ENDPOINTS
// ======================================================
app.get("/api/current-consulting", async (req, res) => {
  try {
    const current = await OP.findOne({ status: "Doctor" }).sort({ _id: 1 });
    res.json(current || {});
  } catch {
    res.status(500).json({ error: "Failed to fetch consulting patient" });
  }
});

app.get("/api/next-in-queue", async (req, res) => {
  try {
    const allPatients = await OP.find({}).sort({ date: -1, time: -1, _id: -1 }).lean();
    const current = allPatients.find((p) => p.status === "Doctor");

    if (!current) {
      const firstPending = allPatients.find((p) => p.status === "Pending");
      return res.json(firstPending || {});
    }

    const currentIndex = allPatients.findIndex((p) => p._id.equals(current._id));
    const nextPatient = allPatients
      .slice(currentIndex + 1)
      .find((p) => p.status === "Pending");

    const fallbackPatient =
      !nextPatient &&
      allPatients.slice(0, currentIndex).find((p) => p.status === "Pending");

    res.json(nextPatient || fallbackPatient || {});
  } catch (err) {
    console.error("❌ Next Queue Error:", err);
    res.status(500).json({ error: "Failed to fetch next queue" });
  }
});

// ======================================================
// 💊 9️⃣ SERVICE MANAGEMENT ROUTES
// ======================================================
app.get("/api/services", async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.post("/api/services", async (req, res) => {
  try {
    const newService = new Service(req.body);
    await newService.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add service" });
  }
});

app.put("/api/services/:id", async (req, res) => {
  try {
    await Service.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update service" });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// ======================================================
// 🚀 10️⃣ Start Server
// ======================================================
app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);
