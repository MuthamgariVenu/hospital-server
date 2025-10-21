import express from "express";
import { bookOP } from "../controllers/bookingController.js";

const router = express.Router();

router.post("/book-op", bookOP);

export default router;
