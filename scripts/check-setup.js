const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de FlyMXNB...');
console.log('==========================================');

let allChecksPassed = true;

// Verificar Node.js
console.log('\n📋 Verificando Node.js...');
try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    console.log(`✅ Node.js ${nodeVersion}`);
    
    if (majorVersion < 16) {
        console.error('❌ Se requiere Node.js 16 o superior');
        allChecksPassed = false;
    }
} catch (error) {
    console.error('❌ Node.js no está instalado');
    allChecksPassed = false;
}

// Verificar npm
console.log('\n📦 Verificando npm...');
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion}`);
} catch (error) {
    console.error('❌ npm no está disponible');
    allChecksPassed = false;
}

// Verificar servidor HTTP
console.log('\n🌐 Verificando servidor HTTP...');
let serverAvailable = false;
try {
    const python3Version = execSync('python3 --version', { encoding: 'utf8' }).trim();
    console.log(`✅ ${python3Version} (python3 -m http.server)`);
    serverAvailable = true;
} catch {
    try {
        const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
        console.log(`✅ ${pythonVersion} (python -m http.server)`);
        serverAvailable = true;
    } catch {
        try {
            const serveVersion = execSync('npx serve --version', { encoding: 'utf8' }).trim();
            console.log(`✅ serve ${serveVersion} (npx serve)`);
            serverAvailable = true;
        } catch {
            console.error('❌ No se encontró servidor HTTP disponible');
            console.log('💡 Instala Python o ejecuta: npm install -g serve');
            allChecksPassed = false;
        }
    }
}

// Verificar dependencias
console.log('\n📚 Verificando dependencias...');
if (fs.existsSync('node_modules')) {
    console.log('✅ node_modules existe');
    
    // Verificar dependencias principales
    const requiredDeps = ['ethers', 'hardhat', '@openzeppelin/contracts'];
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    let depsOk = true;
    requiredDeps.forEach(dep => {
        if (allDeps[dep]) {
            console.log(`✅ ${dep} ${allDeps[dep]}`);
        } else {
            console.log(`❌ ${dep} no encontrado`);
            depsOk = false;
        }
    });
    
    if (!depsOk) {
        allChecksPassed = false;
    }
} else {
    console.error('❌ node_modules no existe');
    console.log('💡 Ejecuta: npm install');
    allChecksPassed = false;
}

// Verificar archivos de configuración
console.log('\n📄 Verificando archivos de configuración...');
const configFiles = [
    { path: '.env', required: false, description: 'Variables de entorno' },
    { path: 'hardhat.config.js', required: true, description: 'Configuración de Hardhat' },
    { path: 'package.json', required: true, description: 'Configuración de npm' },
    { path: 'deployment.json', required: false, description: 'Direcciones de contratos' }
];

configFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
        console.log(`✅ ${file.path} (${file.description})`);
    } else if (file.required) {
        console.error(`❌ ${file.path} - REQUERIDO (${file.description})`);
        allChecksPassed = false;
    } else {
        console.log(`⚠️  ${file.path} - OPCIONAL (${file.description})`);
    }
});

// Verificar archivos de la aplicación
console.log('\n📁 Verificando archivos de la aplicación...');
const appFiles = [
    { path: 'index.html', required: true, description: 'Página principal' },
    { path: 'src/main.js', required: true, description: 'Lógica principal' },
    { path: 'contracts/FlightPayment.sol', required: true, description: 'Contrato principal' },
    { path: 'contracts/MXNBToken.sol', required: true, description: 'Token MXNB' },
    { path: 'scripts/deploy.js', required: true, description: 'Script de despliegue' },
    { path: 'test/FlightPayment.test.js', required: true, description: 'Tests' }
];

appFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
        console.log(`✅ ${file.path} (${file.description})`);
    } else {
        console.error(`❌ ${file.path} - FALTANTE (${file.description})`);
        allChecksPassed = false;
    }
});

// Verificar compilación de contratos
console.log('\n🔨 Verificando compilación de contratos...');
if (fs.existsSync('artifacts') && fs.existsSync('cache')) {
    console.log('✅ Contratos compilados (artifacts y cache existen)');
} else {
    console.log('⚠️  Contratos no compilados');
    console.log('💡 Ejecuta: npm run compile');
}

// Verificar puerto 3000
console.log('\n🔌 Verificando puerto 3000...');
try {
    const result = execSync('lsof -i :3000', { encoding: 'utf8' });
    console.log('⚠️  Puerto 3000 está en uso:');
    console.log(result);
} catch {
    console.log('✅ Puerto 3000 disponible');
}

// Resumen
console.log('\n📊 Resumen de verificación:');
console.log('==========================');

if (allChecksPassed) {
    console.log('🎉 ¡Todas las verificaciones pasaron!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Configura tu PRIVATE_KEY en .env (si no existe)');
    console.log('2. Ejecuta: npm run compile (si no está compilado)');
    console.log('3. Ejecuta: npm start');
    console.log('4. Abre: http://localhost:3000');
    
    if (!fs.existsSync('.env')) {
        console.log('\n⚠️  Archivo .env no encontrado');
        console.log('💡 Ejecuta: npm run dev-setup para crear configuración de desarrollo');
    }
    
    if (!fs.existsSync('artifacts')) {
        console.log('\n⚠️  Contratos no compilados');
        console.log('💡 Ejecuta: npm run compile');
    }
} else {
    console.log('❌ Algunas verificaciones fallaron');
    console.log('\n🔧 Soluciones:');
    console.log('• Para dependencias: npm install');
    console.log('• Para configuración: npm run dev-setup');
    console.log('• Para compilación: npm run compile');
    console.log('• Para servidor: instala Python o ejecuta npm install -g serve');
}

console.log('\n📚 Para más información, consulta el README.md'); 