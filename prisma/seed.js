
import prisma from "../src/prisma/client.js";

async function main() {
    console.log("Seeding database...");

    const cafeCategory = await prisma.category.create({
        data: {
            name: "Brew & Bean Café",
            taxApplicable: true,
            taxPercentage: 18
        }
    });

    const roomCategory = await prisma.category.create({
        data: {
            name: "Meeting Rooms",
            taxApplicable: true,
            taxPercentage: 12
        }
    });

    const coffeeItem = await prisma.item.create({
        data: {
            name: "Coffee",
            categoryId: cafeCategory.id,
            pricingType: "STATIC",
            isBookable: false
        }
    });

    const meetingRoom = await prisma.item.create({
        data: {
            name: "Room A",
            categoryId: roomCategory.id,
            pricingType: "TIERED",
            isBookable: true
        }
    });

    const breakfastCombo = await prisma.item.create({
        data: {
            name: "Breakfast Combo",
            categoryId: cafeCategory.id,
            pricingType: "DYNAMIC",
            isBookable: false
        }
    });

    await prisma.pricingConfig.create({
        data: {
            itemId: coffeeItem.id,
            type: "STATIC",
            staticPrice: { create: { price: 200 } }
        }
    });

    await prisma.pricingConfig.create({
        data: {
            itemId: meetingRoom.id,
            type: "TIERED",
            tiers: {
                createMany: {
                    data: [
                        { maxUsage: 1, price: 300 },
                        { maxUsage: 2, price: 500 },
                        { maxUsage: 4, price: 800 }
                    ]
                }
            }
        }
    });

    const now = new Date();
    const today8am = new Date(now);
    today8am.setHours(8, 0, 0, 0);
    const today11am = new Date(now);
    today11am.setHours(11, 0, 0, 0);

    await prisma.pricingConfig.create({
        data: {
            itemId: breakfastCombo.id,
            type: "DYNAMIC",
            dynamicWindows: {
                create: [
                    { startTime: today8am, endTime: today11am, price: 199 }
                ]
            }
        }
    });

    await prisma.addonGroup.create({
        data: {
            itemId: coffeeItem.id,
            name: "Extras",
            required: false,
            addons: {
                create: [
                    { name: "Extra Shot", price: 50 },
                    { name: "Oat Milk", price: 40 }
                ]
            }
        }
    });

    const availDays = ["MON", "TUE", "WED", "THU", "FRI"];
    for (const day of availDays) {
        const startTime = new Date(today8am);
        startTime.setHours(10, 0, 0, 0);

        const endTime = new Date(today8am);
        endTime.setHours(17, 0, 0, 0);

        await prisma.availability.create({
            data: {
                itemId: meetingRoom.id,
                dayOfWeek: day,
                startTime,
                endTime
            }
        });
    }

    console.log("Seeding done!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
