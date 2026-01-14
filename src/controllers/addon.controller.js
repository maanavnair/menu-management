import prisma from "../prisma/client.js";

export const getAddons = async (_req, res) => {
    try {
        const addons = await prisma.addon.findMany({ include: { group: true } });
        res.json(addons);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch addons" });
    }
};