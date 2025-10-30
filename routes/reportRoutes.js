import express from "express";
import OP from "../models/OP.js"; // use OP collection
import twilio from "twilio";

const router = express.Router();
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ FETCH all OPs whose status = 'Reports' or 'Ready'
router.get("/list", async (req, res) => {
  try {
    const ops = await OP.find({ status: { $in: ["Reports", "Ready"] } });
    const reports = ops.map(op => ({
      opNo: op.opNo,
      name: op.patientName,
      mobile: op.mobile,
      status: op.status
    }));
    res.json({ reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ UPDATE report status + send SMS
router.post("/updateStatus", async (req, res) => {
  try {
    const { opNo, status, name, mobile } = req.body;
    await OP.updateOne({ opNo }, { $set: { status } });

    if (status === "Ready" && mobile) {
      await client.messages.create({
        body: `Dear ${name}, your report is ready for collection at Ashwini Hospital.`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: `+91${mobile}`
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating report:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

export default router;
