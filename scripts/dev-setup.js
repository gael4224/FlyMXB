const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando FlyMXNB para desarrollo...');
console.log('==========================================');

// Verificar dependencias básicas
console.log('\n🔍 Verificando dependencias...');

try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js ${nodeVersion}`);
    
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion}`);
    
    // Verificar si Python está disponible para el servidor
    try {
        const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
        console.log(`✅ ${pythonVersion}`);
    } catch {
        try {
            const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
            console.log(`✅ ${pythonVersion}`);
        } catch {
            console.log('⚠️  Python no detectado - se usará npx serve como alternativa');
        }
    }
} catch (error) {
    console.error('❌ Error verificando dependencias:', error.message);
    process.exit(1);
}

// Instalar dependencias si no están instaladas
if (!fs.existsSync('node_modules')) {
    console.log('\n📦 Instalando dependencias...');
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ Dependencias instaladas');
    } catch (error) {
        console.error('❌ Error instalando dependencias:', error.message);
        process.exit(1);
    }
} else {
    console.log('✅ Dependencias ya instaladas');
}

// Crear archivo .env para desarrollo
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.log('\n📝 Creando archivo .env para desarrollo...');
    const envContent = `# FlyMXNB Development Environment
# Configuración para desarrollo local

# Arbitrum Sepolia (testnet)
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Private Key para testing (genera una nueva wallet)
# IMPORTANTE: Solo usa esta wallet para testing
PRIVATE_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Arbiscan API Key (opcional)
ARBISCAN_API_KEY=

# Configuración de desarrollo
NODE_ENV=development

# URLs de exploradores
ARBISCAN_SEPOLIA_URL=https://sepolia.arbiscan.io

# Configuración de gas
GAS_LIMIT=3000000
GAS_PRICE=1000000000
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env creado para desarrollo');
    console.log('⚠️  IMPORTANTE: Cambia la PRIVATE_KEY por una wallet de testing');
}

// Compilar contratos
console.log('\n🔨 Compilando contratos...');
try {
    execSync('npm run compile', { stdio: 'inherit' });
    console.log('✅ Contratos compilados');
} catch (error) {
    console.error('❌ Error compilando contratos:', error.message);
    process.exit(1);
}

// Crear archivo deployment.json de ejemplo
const deploymentPath = path.join(process.cwd(), 'deployment.json');
if (!fs.existsSync(deploymentPath)) {
    console.log('\n📄 Creando archivo deployment.json de ejemplo...');
    const deploymentContent = {
        "network": "arbitrum-sepolia",
        "flightPayment": "0x0000000000000000000000000000000000000000",
        "mxnbToken": "0x0000000000000000000000000000000000000000",
        "deployedAt": new Date().toISOString(),
        "note": "Reemplaza estas direcciones con las reales después del despliegue"
    };
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentContent, null, 2));
    console.log('✅ Archivo deployment.json creado');
}

// Verificar estructura de archivos
console.log('\n📁 Verificando estructura de archivos...');
const requiredFiles = [
    'index.html',
    'src/main.js',
    'contracts/FlightPayment.sol',
    'contracts/MXNBToken.sol',
    'hardhat.config.js',
    'package.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - FALTANTE`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n❌ Faltan archivos requeridos');
    process.exit(1);
}

console.log('\n🎉 ¡Configuración de desarrollo completada!');
console.log('==========================================');
console.log('\n📋 Comandos disponibles:');
console.log('• npm start          - Iniciar servidor local');
console.log('• npm run compile    - Compilar contratos');
console.log('• npm test           - Ejecutar tests');
console.log('• npm run deploy:testnet - Desplegar en testnet');
console.log('• npm run admin      - Acceder a funciones administrativas');
console.log('\n🌐 La aplicación estará disponible en: http://localhost:3000');
console.log('\n💡 Tips de desarrollo:');
console.log('• Usa MetaMask con Arbitrum Sepolia para testing');
console.log('• Obtén ETH de testnet en: https://faucet.quicknode.com/arbitrum/sepolia');
console.log('• Los contratos se despliegan automáticamente con datos de prueba'); 