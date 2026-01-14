import { Router } from "express";
import { getAddons } from "../controllers/addon.controller.js";

const router = Router();

router.get("/", getAddons);

export default router;
