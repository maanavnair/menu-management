import { Router } from "express";
import { deleteItem, getItemPrice, getItems, searchItems } from "../controllers/item.controller.js";

const router = Router();

router.get("/", getItems);
router.get("/:id/price", getItemPrice);
router.get("/search", searchItems);
router.patch("/delete/:id", deleteItem);

export default router;
