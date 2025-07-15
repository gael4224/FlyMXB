const hre = require("hardhat");

async function main() {
  console.log("🚀 Iniciando despliegue de contratos...");

  // Desplegar MXNB Token
  console.log("📝 Desplegando MXNB Token...");
  const MXNBToken = await hre.ethers.getContractFactory("MXNBToken");
  const mxnbToken = await MXNBToken.deploy();
  await mxnbToken.waitForDeployment();
  const mxnbTokenAddress = await mxnbToken.getAddress();
  console.log("✅ MXNB Token desplegado en:", mxnbTokenAddress);

  // Desplegar FlightPayment
  console.log("✈️ Desplegando FlightPayment...");
  const FlightPayment = await hre.ethers.getContractFactory("FlightPayment");
  const flightPayment = await FlightPayment.deploy();
  await flightPayment.waitForDeployment();
  const flightPaymentAddress = await flightPayment.getAddress();
  console.log("✅ FlightPayment desplegado en:", flightPaymentAddress);

  // Crear algunos vuelos de ejemplo
  console.log("🎫 Creando vuelos de ejemplo...");
  const [deployer] = await hre.ethers.getSigners();
  
  // Vuelo 1: CDMX a Guadalajara
  const flight1 = await flightPayment.createFlight(
    "Ciudad de México",
    "Guadalajara",
    Math.floor(Date.now() / 1000) + 86400, // Mañana
    1500000000, // 1500 MXNB (en wei)
    50000000,   // 50 MXNB TUA
    150
  );
  await flight1.wait();

  // Vuelo 2: Guadalajara a Monterrey
  const flight2 = await flightPayment.createFlight(
    "Guadalajara",
    "Monterrey",
    Math.floor(Date.now() / 1000) + 172800, // En 2 días
    1200000000, // 1200 MXNB
    50000000,   // 50 MXNB TUA
    120
  );
  await flight2.wait();

  // Vuelo 3: Monterrey a Cancún
  const flight3 = await flightPayment.createFlight(
    "Monterrey",
    "Cancún",
    Math.floor(Date.now() / 1000) + 259200, // En 3 días
    1800000000, // 1800 MXNB
    50000000,   // 50 MXNB TUA
    100
  );
  await flight3.wait();

  // Crear promociones
  console.log("🎉 Creando promociones...");
  
  // Promoción 1: Descuento por pago anticipado
  const promotion1 = await flightPayment.createPromotion(
    "Pago Anticipado MXNB",
    15, // 15% descuento
    Math.floor(Date.now() / 1000) + 604800, // Válida por 7 días
    100 // Máximo 100 usos
  );
  await promotion1.wait();

  // Promoción 2: Descuento especial
  const promotion2 = await flightPayment.createPromotion(
    "Descuento Especial MXNB",
    10, // 10% descuento
    Math.floor(Date.now() / 1000) + 1209600, // Válida por 14 días
    50 // Máximo 50 usos
  );
  await promotion2.wait();

  console.log("🎊 ¡Despliegue completado exitosamente!");
  console.log("📋 Resumen del despliegue:");
  console.log("   MXNB Token:", mxnbTokenAddress);
  console.log("   FlightPayment:", flightPaymentAddress);
  console.log("   Vuelos creados: 3");
  console.log("   Promociones creadas: 2");
  console.log("   Deployer:", deployer.address);

  // Guardar direcciones en un archivo para el frontend
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    mxnbToken: mxnbTokenAddress,
    flightPayment: flightPaymentAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Información de despliegue guardada en deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error en el despliegue:", error);
    process.exit(1);
  }); 