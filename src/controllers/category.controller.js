
import prisma from "../prisma/client.js";

export const getCategories = async (_req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: { subcategories: true, items: true }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch categories" });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const category = await prisma.category.findUnique({
            where: { id },
            include: { subcategories: true, items: true }
        });

        if (!category) return res.status(404).json({ message: "Category not found" });

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch category" });
    }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Mark category inactive
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    // Mark all subcategories inactive
    await prisma.subcategory.updateMany({
      where: { categoryId: id },
      data: { isActive: false },
    });

    // Mark all items in category inactive
    await prisma.item.updateMany({
      where: { categoryId: id },
      data: { isActive: false },
    });

    res.json({ message: "Category and related subcategories/items deactivated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
