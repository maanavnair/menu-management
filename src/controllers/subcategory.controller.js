
import prisma from "../prisma/client.js";

export const getSubcategories = async (_req, res) => {
    try {
        const subcategories = await prisma.subcategory.findMany({
            include: { category: true, items: true }
        });
        res.json(subcategories);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch subcategories" });
    }
};

export const getSubcategoryById = async (req, res) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const subcategory = await prisma.subcategory.findUnique({
            where: { id },
            include: { category: true, items: true }
        });

        if (!subcategory) return res.status(404).json({ message: "Subcategory not found" });

        res.json(subcategory);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch subcategory" });
    }
};

export const deleteSubcategory = async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  // Mark subcategory inactive
  await prisma.subcategory.update({
    where: { id },
    data: { isActive: false },
  });

  // Mark all items in subcategory inactive
  await prisma.item.updateMany({
    where: { subcategoryId: id },
    data: { isActive: false },
  });

  res.json({ message: "Subcategory and related items deactivated" });
};
