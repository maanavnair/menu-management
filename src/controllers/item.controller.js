
import prisma from "../prisma/client.js";

const applyTax = (amount, taxPercentage) =>
    taxPercentage ? (amount * taxPercentage) / 100 : 0;

export const getItemPrice = async (req, res) => {
    try {
        const itemId = req.params.id;
        const usage = req.query.usage ? Number(req.query.usage) : null;
        const selectedAddonIds = req.query.addonIds
            ? req.query.addonIds.split(",")
            : [];

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                category: true,
                subcategory: true,
                pricingConfig: {
                    include: {
                        staticPrice: true,
                        discountPrice: true,
                        tiers: true,
                        dynamicWindows: true,
                    },
                },
                addonGroups: {
                    include: {
                        addons: true,
                    },
                },
            },
        });

        //active validation

        if (!item || !item.isActive) {
            return res.status(404).json({ error: "Item not found" });
        }

        if (item.category && !item.category.isActive) {
            return res.status(404).json({ error: "Item not found" });
        }

        if (item.subcategory && !item.subcategory.isActive) {
            return res.status(404).json({ error: "Item not found" });
        }

        //tax
        let taxPercentage = 0;

        if (item.subcategory?.taxApplicable) {
            taxPercentage = item.subcategory.taxPercentage || 0;
        } else if (item.category?.taxApplicable) {
            taxPercentage = item.category.taxPercentage || 0;
        }

        //resolving price
        const pricing = item.pricingConfig;
        if (!pricing) {
            return res.status(400).json({ error: "Pricing configuration missing" });
        }

        let basePrice = 0;
        let pricingDetails = {};

        switch (pricing.type) {
            case "STATIC":
                basePrice = pricing.staticPrice.price;
                pricingDetails = {
                    rule: "STATIC",
                    price: basePrice,
                };
                break;

            case "DISCOUNTED": {
                const dp = pricing.discountPrice;
                let final;

                if (dp.discountType === "FLAT") {
                    final = Math.max(0, dp.basePrice - dp.discountValue);
                } else {
                    final = Math.max(
                        0,
                        dp.basePrice - (dp.basePrice * dp.discountValue) / 100
                    );
                }

                basePrice = final;
                pricingDetails = {
                    rule: "DISCOUNTED",
                    originalPrice: dp.basePrice,
                    discountType: dp.discountType,
                    discountValue: dp.discountValue,
                    finalPrice: final,
                };
                break;
            }

            case "TIERED": {
                if (!usage) {
                    return res.status(400).json({
                        error: "Usage parameter required for tiered pricing",
                    });
                }

                const tier = pricing.tiers
                    .sort((a, b) => a.maxUsage - b.maxUsage)
                    .find((t) => usage <= t.maxUsage);

                if (!tier) {
                    return res.status(400).json({
                        error: "No pricing tier available for given usage",
                    });
                }

                basePrice = tier.price;
                pricingDetails = {
                    rule: "TIERED",
                    usage,
                    appliedTier: {
                     maxUsage: tier.maxUsage,
                    price: tier.price,
                    },
                };
                break;
            }

            case "DYNAMIC": {
                const now = new Date();

                const window = pricing.dynamicWindows.find(
                    (w) => now >= w.startTime && now <= w.endTime
                );

                if (!window) {
                    return res
                        .status(400)
                        .json({ error: "Item not available at this time" });
                }

                basePrice = window.price;
                pricingDetails = {
                    rule: "DYNAMIC",
                    activeWindow: {
                        startTime: window.startTime,
                        endTime: window.endTime,
                        price: window.price,
                    },
                };
                break;
            }

            case "FREE":
                basePrice = 0;
                pricingDetails = {
                    rule: "COMPLIMENTARY",
                    price: 0,
                };
                break;

            default:
                return res.status(400).json({ error: "Invalid pricing type" });
        }

        //selected addons
        const allAddons = item.addonGroups.flatMap((g) => g.addons);

        const selectedAddons = allAddons.filter((a) =>
            selectedAddonIds.includes(a.id)
        );

        const addonTotal = selectedAddons.reduce(
            (sum, addon) => sum + addon.price,
            0
        );

        const tax = applyTax(basePrice, taxPercentage);
        const grandTotal = basePrice + tax;
        const finalPrice = grandTotal + addonTotal;

        return res.json({
            itemId: item.id,
            name: item.name,
            pricingType: pricing.type,
            pricingDetails,
            basePrice,
            addons: selectedAddons,
            addonTotal,
            tax,
            grandTotal,
            finalPrice,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getItems = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const sort = req.query.sort || "createdAt";
        const order = req.query.order === "desc" ? "desc" : "asc";

        const skip = (page - 1) * limit;

        //allowed sort fields
        const allowedSorts = {
            name: { name: order },
            createdAt: { createdAt: order },
        };

        const orderBy = allowedSorts[sort] || { createdAt: "asc" };

        const [items, total] = await Promise.all([
            prisma.item.findMany({
                where: {
                    isActive: true
                },
                include: {
                    category: true,
                    subcategory: true,
                    pricingConfig: true
                },
                orderBy,
                skip,
                take: limit
            }),
            prisma.item.count({
                where: {
                    isActive: true
                }
            })
        ]);

        return res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            items
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to fetch items" });
    }
};


export const deleteItem = async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.item.update({
        where: {id},
        data: {isActive: false},
    })
}

export const searchItems = async (req, res) => {
    try {
        const {
            q,
            minPrice,
            maxPrice,
            categoryId,
            taxApplicable,
            page = 1,
            limit = 10,
            sortBy = "name",
            sortDir = "asc",
        } = req.query;

        const take = parseInt(limit);
        const skip = (parseInt(page) - 1) * take;

        // Build filters dynamically
        const filters = {
            isActive: true, // active only
        };

        if (q) {
            filters.name = { contains: q, mode: "insensitive" };
        }

        if (categoryId) {
            filters.categoryId = categoryId;
        }

        const items = await prisma.item.findMany({
            where: filters,
            include: {
                category: true,
                subcategory: true,
                pricingConfig: {
                    include: { staticPrice: true, discountPrice: true, tiers: true, dynamicWindows: true },
                },
            },
        });

        const filtered = items.filter((item) => {
            let price = 0;
            const pricing = item.pricingConfig;
            if (!pricing) return false;

            switch (pricing.type) {
                case "STATIC":
                    price = pricing.staticPrice?.price || 0;
                    break;
                case "DISCOUNTED":
                    if (pricing.discountPrice) {
                        const dp = pricing.discountPrice;
                        price =
                            dp.discountType === "FLAT"
                                ? Math.max(0, dp.basePrice - dp.discountValue)
                                : Math.max(0, dp.basePrice - (dp.basePrice * dp.discountValue) / 100);
                    }
                    break;
                case "TIERED":
                    price = pricing.tiers?.[0]?.price || 0;
                    break;
                case "DYNAMIC":
                    const now = new Date();
                    const currentWindow = pricing.dynamicWindows?.find(
                        (w) => now >= w.startTime && now <= w.endTime
                    );
                    price = currentWindow?.price || 0;
                    break;
                case "FREE":
                    price = 0;
                    break;
            }

            // Price range filter
            if (minPrice && price < parseFloat(minPrice)) return false;
            if (maxPrice && price > parseFloat(maxPrice)) return false;

            // Tax applicable filter
            if (taxApplicable != null) {
                const taxCat = item.subcategory?.taxApplicable ?? item.category?.taxApplicable ?? false;
                if (taxApplicable === "true" && !taxCat) return false;
                if (taxApplicable === "false" && taxCat) return false;
            }

            return true;
        });

        // Sorting
        const sorted = filtered.sort((a, b) => {
            let valA, valB;
            if (sortBy === "name") {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortBy === "price") {
                valA = a.pricingConfig?.staticPrice?.price || 0;
                valB = b.pricingConfig?.staticPrice?.price || 0;
            } else if (sortBy === "createdAt") {
                valA = a.createdAt;
                valB = b.createdAt;
            }

            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        // Pagination
        const paginated = sorted.slice(skip, skip + take);

        return res.json({
            total: filtered.length,
            page: parseInt(page),
            limit: take,
            items: paginated.map((item) => ({
                id: item.id,
                name: item.name,
                pricingType: item.pricingConfig?.type,
                category: item.category?.name,
                subcategory: item.subcategory?.name,
            })),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
};