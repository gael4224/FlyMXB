const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando FlyMXNB...');
console.log('==========================');

// Verificar si Node.js está instalado
try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js ${nodeVersion} detectado`);
    
    // Verificar versión mínima
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
        console.error('❌ Error: Se requiere Node.js 16 o superior');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Error: Node.js no está instalado');
    process.exit(1);
}

// Verificar si npm está disponible
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion} detectado`);
} catch (error) {
    console.error('❌ Error: npm no está disponible');
    process.exit(1);
}

// Instalar dependencias
console.log('\n📦 Instalando dependencias...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencias instaladas correctamente');
} catch (error) {
    console.error('❌ Error instalando dependencias:', error.message);
    process.exit(1);
}

// Crear archivo .env si no existe
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.log('\n📝 Creando archivo .env...');
    const envContent = `# FlyMXNB Environment Configuration
# Copia este archivo como .env y configura tus valores

# Arbitrum RPC URLs
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Private Key para despliegue (¡MANTENER SEGURO!)
# Genera una nueva wallet para testing o usa una existente
PRIVATE_KEY=tu_private_key_aqui_sin_0x

# Arbiscan API Key (opcional, para verificación de contratos)
# Obtén tu API key en: https://arbiscan.io/apis
ARBISCAN_API_KEY=tu_api_key_aqui

# Configuración de desarrollo
NODE_ENV=development

# URLs de exploradores
ARBISCAN_URL=https://arbiscan.io
ARBISCAN_SEPOLIA_URL=https://sepolia.arbiscan.io

# Configuración de gas (opcional)
GAS_LIMIT=3000000
GAS_PRICE=1000000000
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env creado');
    console.log('⚠️  IMPORTANTE: Configura tu PRIVATE_KEY en el archivo .env');
}

// Compilar contratos
console.log('\n🔨 Compilando contratos...');
try {
    execSync('npm run compile', { stdio: 'inherit' });
    console.log('✅ Contratos compilados correctamente');
} catch (error) {
    console.error('❌ Error compilando contratos:', error.message);
    process.exit(1);
}

// Ejecutar tests
console.log('\n🧪 Ejecutando tests...');
try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('✅ Tests ejecutados correctamente');
} catch (error) {
    console.error('❌ Error ejecutando tests:', error.message);
    process.exit(1);
}

console.log('\n🎉 ¡Configuración completada!');
console.log('==========================');
console.log('\n📋 Próximos pasos:');
console.log('1. Configura tu PRIVATE_KEY en el archivo .env');
console.log('2. Para iniciar servidor: npm start');
console.log('3. Para desplegar en testnet: npm run deploy:testnet');
console.log('4. Para desplegar en mainnet: npm run deploy');
console.log('\n🌐 La aplicación estará disponible en: http://localhost:3000');
console.log('\n📚 Para más información, consulta el README.md'); 