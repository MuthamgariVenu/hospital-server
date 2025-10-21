import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

export const bookOP = async (req, res) => {
  try {
    const { name, number, age } = req.body;

    if (!name || !number || !age) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Generate a unique OP number
    const opNumber = `OP${Date.now()}`;

    // Example ETA
    const eta = "30 minutes";

    // Twilio client setup
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Send SMS
    await client.messages.create({
      body: `Ashwini Neuro Super Speciality Center\nYour OP booked successfully!\nOP Number: ${opNumber}\nDoctor ETA: ${eta}\nTrack: https://hospital-webapp.netlify.app/track-op`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${number}`, // ensure +91 for Indian numbers
    });

    // Respond to frontend
    res.status(200).json({ success: true, opNumber, eta });
  } catch (err) {
    console.error("Booking Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
