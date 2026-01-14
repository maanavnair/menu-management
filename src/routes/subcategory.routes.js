import { Router } from "express";
import { getSubcategories, getSubcategoryById, deleteSubcategory } from "../controllers/subcategory.controller.js";

const router = Router();

router.get("/", getSubcategories);
router.get("/:id", getSubcategoryById);
router.patch("/delete/:id", deleteSubcategory);

export default router;
