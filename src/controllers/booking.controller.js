
import prisma from "../prisma/client.js";


export const getAvailability = async (req, res) => {
    try {
        const itemId = req.params.id;

        // Fetch item + availabilities + bookings
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                availabilities: true,
                bookings: true
            }
        });

        if (!item || !item.isActive) return res.status(404).json({ message: "Item not found" });
        if (!item.isBookable) return res.status(400).json({ message: "Item is not bookable" });

        const now = new Date();
        const todayDayNumber = now.getDay();

        // Build available slots for today
        const availableSlots = item.availabilities
            .filter(a => todayDayNumber === dayOfWeekToNumber(a.dayOfWeek))
            .map(a => ({ startTime: a.startTime, endTime: a.endTime }))
            .filter(slot => {
                const conflict = item.bookings.some(
                    b => slot.startTime < b.endTime && slot.endTime > b.startTime
                );
                return !conflict;
            });

        return res.json({ availableSlots });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to get availability" });
    }
};


export const bookSlot = async (req, res) => {
    try {
        const itemId = req.params.id;
        const { startTime, endTime } = req.body;

        if (!startTime || !endTime) return res.status(400).json({ message: "startTime and endTime required" });

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) return res.status(400).json({ message: "Invalid time range" });

        // Fetch item + bookings + availabilities
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                bookings: true,
                availabilities: true
            }
        });

        if (!item || !item.isActive) return res.status(404).json({ message: "Item not found" });
        if (!item.isBookable) return res.status(400).json({ message: "Item is not bookable" });

        // Check for booking conflicts
        const conflict = item.bookings.some(b => start < b.endTime && end > b.startTime);
        if (conflict) return res.status(400).json({ message: "Slot already booked" });

        // Check if slot is within availabilities
        const dayNumber = start.getDay(); // 0 = Sun, 1 = Mon, ...
        const validSlot = item.availabilities.some(a =>
            dayNumber === dayOfWeekToNumber(a.dayOfWeek) &&
            start >= a.startTime &&
            end <= a.endTime
        );
        if (!validSlot) return res.status(400).json({ message: "Slot not available according to schedule" });

        // Create booking
        const booking = await prisma.booking.create({
            data: {
                itemId,
                bookingDate: start,
                startTime: start,
                endTime: end
            }
        });

        return res.status(201).json({ message: "Booking successful", booking });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to book slot" });
    }
};

const dayOfWeekToNumber = (day) => {
    switch (day) {
        case "SUN": return 0;
        case "MON": return 1;
        case "TUE": return 2;
        case "WED": return 3;
        case "THU": return 4;
        case "FRI": return 5;
        case "SAT": return 6;
        default: return 0;
    }
};
