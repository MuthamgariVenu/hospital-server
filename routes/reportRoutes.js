import express from "express";
import OP from "../models/OP.js"; // use OP collection
import twilio from "twilio";

const router = express.Router();
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ FETCH all OPs whose status = 'Reports' or 'Ready' or 'Paid' or 'Completed' (FIFO order)
router.get("/list", async (req, res) => {
  try {
    const ops = await OP.find({
      status: { $in: ["Reports", "Ready", "Paid", "Completed"] },
    })
      .sort({ createdAt: 1 }); // ✅ FIFO: oldest first (ascending by createdAt timestamp)

    // ✅ Match adminRoute format (sync same key names)
    const reports = ops.map((op, index) => ({
      sNo: index + 1,              // ✅ auto serial number
      opNo: op.opNumber,           // from OP.js model
      name: op.patientName,        // from OP.js model
      mobile: op.patientNumber,    // from OP.js model
      status: op.status,
      createdAt: op.createdAt      // keep for reference if needed
    }));

    res.json({ success: true, reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ UPDATE report status + send SMS
router.post("/updateStatus", async (req, res) => {
  try {
    const { opNo, status, name, mobile } = req.body;

    // ✅ Update the correct field (opNumber) in DB
    await OP.updateOne({ opNumber: opNo }, { $set: { status } });

    // ✅ Send SMS only when Ready
    if (status === "Ready" && mobile) {
      await client.messages.create({
        body: `Dear ${name}, your report is ready for collection at Ashwini Hospital.`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: `+91${mobile}`,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating report:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

export default router;
