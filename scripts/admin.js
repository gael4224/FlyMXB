const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔧 Panel de Administración FlyMXNB");
    console.log("=====================================");

    // Cargar configuración
    let deployment;
    try {
        deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    } catch (error) {
        console.error("❌ Error: No se encontró deployment.json");
        console.log("Ejecuta primero: npm run deploy");
        return;
    }

    const [admin] = await hre.ethers.getSigners();
    console.log(`👤 Admin: ${admin.address}`);

    // Conectar al contrato
    const FlightPayment = await hre.ethers.getContractFactory("FlightPayment");
    const flightPayment = FlightPayment.attach(deployment.flightPayment);

    // Verificar que somos el owner
    const owner = await flightPayment.owner();
    if (owner !== admin.address) {
        console.error("❌ Error: No eres el owner del contrato");
        return;
    }

    console.log("✅ Conectado como owner del contrato");

    // Mostrar menú
    console.log("\n📋 Opciones disponibles:");
    console.log("1. Ver vuelos activos");
    console.log("2. Crear nuevo vuelo");
    console.log("3. Ver promociones activas");
    console.log("4. Crear nueva promoción");
    console.log("5. Ver balance del contrato");
    console.log("6. Retirar fondos");
    console.log("7. Ver estadísticas");
    console.log("0. Salir");

    // Simular interacción (en producción usarías readline)
    const option = process.argv[2] || "1";

    switch (option) {
        case "1":
            await showActiveFlights(flightPayment);
            break;
        case "2":
            await createNewFlight(flightPayment, admin);
            break;
        case "3":
            await showActivePromotions(flightPayment);
            break;
        case "4":
            await createNewPromotion(flightPayment, admin);
            break;
        case "5":
            await showContractBalance(flightPayment);
            break;
        case "6":
            await withdrawFunds(flightPayment, admin);
            break;
        case "7":
            await showStatistics(flightPayment);
            break;
        default:
            console.log("👋 ¡Hasta luego!");
    }
}

async function showActiveFlights(contract) {
    console.log("\n✈️ Vuelos Activos:");
    console.log("==================");

    try {
        const flights = await contract.getActiveFlights();
        
        if (flights.length === 0) {
            console.log("No hay vuelos activos");
            return;
        }

        flights.forEach((flight, index) => {
            console.log(`\n${index + 1}. ${flight.origin} → ${flight.destination}`);
            console.log(`   Fecha: ${new Date(flight.departureTime * 1000).toLocaleString('es-MX')}`);
            console.log(`   Precio: ${hre.ethers.formatEther(flight.price)} MXNB`);
            console.log(`   TUA: ${hre.ethers.formatEther(flight.tuaFee)} MXNB`);
            console.log(`   Asientos disponibles: ${flight.availableSeats}`);
            console.log(`   ID: ${flight.flightId}`);
        });
    } catch (error) {
        console.error("❌ Error obteniendo vuelos:", error.message);
    }
}

async function createNewFlight(contract, admin) {
    console.log("\n🆕 Crear Nuevo Vuelo:");
    console.log("====================");

    // Datos de ejemplo (en producción serían inputs del usuario)
    const flightData = {
        origin: "Ciudad de México",
        destination: "Tijuana",
        departureTime: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 días
        price: hre.ethers.parseEther("2000"),
        tuaFee: hre.ethers.parseEther("50"),
        availableSeats: 120
    };

    try {
        const tx = await contract.createFlight(
            flightData.origin,
            flightData.destination,
            flightData.departureTime,
            flightData.price,
            flightData.tuaFee,
            flightData.availableSeats
        );

        console.log("⏳ Procesando transacción...");
        await tx.wait();
        console.log("✅ Vuelo creado exitosamente!");
        console.log(`📋 Hash: ${tx.hash}`);
    } catch (error) {
        console.error("❌ Error creando vuelo:", error.message);
    }
}

async function showActivePromotions(contract) {
    console.log("\n🎉 Promociones Activas:");
    console.log("=======================");

    try {
        const promotions = await contract.getActivePromotions();
        
        if (promotions.length === 0) {
            console.log("No hay promociones activas");
            return;
        }

        promotions.forEach((promotion, index) => {
            console.log(`\n${index + 1}. ${promotion.name}`);
            console.log(`   Descuento: ${promotion.discountPercentage}%`);
            console.log(`   Válido hasta: ${new Date(promotion.validUntil * 1000).toLocaleString('es-MX')}`);
            console.log(`   Usos: ${promotion.currentUses}/${promotion.maxUses}`);
            console.log(`   ID: ${promotion.promotionId}`);
        });
    } catch (error) {
        console.error("❌ Error obteniendo promociones:", error.message);
    }
}

async function createNewPromotion(contract, admin) {
    console.log("\n🆕 Crear Nueva Promoción:");
    console.log("=========================");

    // Datos de ejemplo
    const promotionData = {
        name: "Descuento de Verano",
        discountPercentage: 20,
        validUntil: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 días
        maxUses: 200
    };

    try {
        const tx = await contract.createPromotion(
            promotionData.name,
            promotionData.discountPercentage,
            promotionData.validUntil,
            promotionData.maxUses
        );

        console.log("⏳ Procesando transacción...");
        await tx.wait();
        console.log("✅ Promoción creada exitosamente!");
        console.log(`📋 Hash: ${tx.hash}`);
    } catch (error) {
        console.error("❌ Error creando promoción:", error.message);
    }
}

async function showContractBalance(contract) {
    console.log("\n💰 Balance del Contrato:");
    console.log("========================");

    try {
        const balance = await contract.getContractBalance();
        console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
        
        if (balance > 0) {
            console.log("💡 Tienes fondos disponibles para retirar");
        } else {
            console.log("ℹ️ No hay fondos en el contrato");
        }
    } catch (error) {
        console.error("❌ Error obteniendo balance:", error.message);
    }
}

async function withdrawFunds(contract, admin) {
    console.log("\n💸 Retirar Fondos:");
    console.log("==================");

    try {
        const balance = await contract.getContractBalance();
        
        if (balance === 0) {
            console.log("ℹ️ No hay fondos para retirar");
            return;
        }

        console.log(`Balance actual: ${hre.ethers.formatEther(balance)} ETH`);
        console.log("⏳ Procesando retiro...");

        const tx = await contract.withdrawFunds();
        await tx.wait();

        console.log("✅ Fondos retirados exitosamente!");
        console.log(`📋 Hash: ${tx.hash}`);
        console.log(`💰 Destinatario: ${admin.address}`);
    } catch (error) {
        console.error("❌ Error retirando fondos:", error.message);
    }
}

async function showStatistics(contract) {
    console.log("\n📊 Estadísticas del Sistema:");
    console.log("============================");

    try {
        const flights = await contract.getActiveFlights();
        const promotions = await contract.getActivePromotions();
        const balance = await contract.getContractBalance();

        console.log(`✈️ Vuelos activos: ${flights.length}`);
        console.log(`🎉 Promociones activas: ${promotions.length}`);
        console.log(`💰 Balance del contrato: ${hre.ethers.formatEther(balance)} ETH`);

        // Calcular estadísticas de vuelos
        let totalSeats = 0;
        let availableSeats = 0;
        let totalRevenue = 0;

        flights.forEach(flight => {
            totalSeats += flight.availableSeats;
            availableSeats += flight.availableSeats;
            totalRevenue += Number(hre.ethers.formatEther(flight.price)) * (150 - flight.availableSeats);
        });

        console.log(`💺 Asientos totales disponibles: ${availableSeats}`);
        console.log(`📈 Ingresos estimados: ${totalRevenue.toFixed(2)} MXNB`);

    } catch (error) {
        console.error("❌ Error obteniendo estadísticas:", error.message);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Error en el panel de administración:", error);
            process.exit(1);
        });
}

module.exports = {
    showActiveFlights,
    createNewFlight,
    showActivePromotions,
    createNewPromotion,
    showContractBalance,
    withdrawFunds,
    showStatistics
}; 