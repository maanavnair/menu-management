import express from "express";
import itemRoutes from "./routes/item.routes.js";
import categoryRoutes from "./routes/category.routes.js"
import subcategoryRoutes from "./routes/subcategory.routes.js"
import addonRoutes from "./routes/addon.routes.js"
import bookingRoutes from "./routes/booking.route.js"

const app = express();

app.use(express.json());

app.use("/items", itemRoutes);
app.use("/booking", bookingRoutes);
app.use("/categories", categoryRoutes);
app.use("/subcategory", subcategoryRoutes);
app.use("/addons", addonRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

export default app;