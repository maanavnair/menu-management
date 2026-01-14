import { Router } from "express";
import { getCategories, getCategoryById, deleteCategory } from "../controllers/category.controller.js";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.patch("/delete/:id", deleteCategory)

export default router;
