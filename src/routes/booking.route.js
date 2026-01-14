import { Router } from "express";
import { getAvailability, bookSlot } from "../controllers/booking.controller.js";

const router = Router();

router.get("/items/:id/availability", getAvailability);
router.post("/items/:id/book", bookSlot);

export default router;
