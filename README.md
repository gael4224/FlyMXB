# FlyMXB - Plataforma de Pagos de Vuelos con MXNB

Una aplicación web completa para pagar vuelos de avión utilizando MXNB (Peso Mexicano Digital) sobre la red Arbitrum. La plataforma incluye autenticación con MetaMask, generación de wallets por email, promociones exclusivas, y gestión completa de boletos.

## 🚀 Características

- **Pagos con MXNB**: Paga vuelos y TUA (Tarifa de Uso de Aeropuerto) con MXNB
- **Autenticación Dual**: MetaMask y generación de wallet por email
- **Promociones Exclusivas**: Descuentos especiales para pagos con MXNB
- **Gestión de Boletos**: Visualización y gestión de boletos comprados
- **QR Codes**: Generación automática de códigos QR para boletos
- **Red Arbitrum**: Transacciones rápidas y económicas
- **UI Moderna**: Interfaz responsive con TailwindCSS
- **Smart Contracts**: Contratos seguros en Solidity

## 📋 Requisitos

- Node.js 16 o superior
- npm o yarn
- MetaMask (para autenticación)
- Python 3 (opcional, para servidor local)

## 🛠️ Instalación

### Configuración Rápida

```bash
# Clonar el repositorio
git clone <repository-url>
cd FlyMXNB

# Configuración automática
npm run dev-setup

# Iniciar aplicación
npm start
```

### Configuración Manual

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 3. Compilar contratos
npm run compile

# 4. Ejecutar tests
npm test

# 5. Iniciar aplicación
npm start
```

## ⚙️ Configuración

### Variables de Entorno (.env)

```env
# Arbitrum RPC URLs
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Private Key para despliegue (¡MANTENER SEGURO!)
PRIVATE_KEY=tu_private_key_aqui_sin_0x

# Arbiscan API Key (opcional, para verificación)
ARBISCAN_API_KEY=tu_api_key_aqui

# Configuración de desarrollo
NODE_ENV=development
```

### Configuración de Redes

La aplicación soporta:
- **Arbitrum One** (mainnet): Para producción
- **Arbitrum Sepolia** (testnet): Para desarrollo y testing

## 🚀 Uso

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
npm start

# La aplicación estará disponible en: http://localhost:3000
```

### Despliegue

```bash
# Desplegar en testnet
npm run deploy:testnet

# Desplegar en mainnet
npm run deploy

# Verificar contratos
npm run verify
```

### Funciones Administrativas

```bash
# Panel de administración
npm run admin

# Gestión de vuelos
npm run admin:flights
npm run admin:create-flight

# Gestión de promociones
npm run admin:promotions
npm run admin:create-promotion

# Gestión de fondos
npm run admin:balance
npm run admin:withdraw

# Estadísticas
npm run admin:stats
```

## 📁 Estructura del Proyecto

```
FlyMXNB/
├── contracts/                 # Smart Contracts
│   ├── FlightPayment.sol     # Contrato principal
│   └── MXNBToken.sol         # Token MXNB
├── src/                      # Frontend
│   └── main.js              # Lógica principal
├── scripts/                  # Scripts de utilidad
│   ├── deploy.js            # Despliegue de contratos
│   ├── admin.js             # Funciones administrativas
│   ├── setup.js             # Configuración inicial
│   ├── dev-setup.js         # Configuración de desarrollo
│   └── check-setup.js       # Verificación de configuración
├── test/                     # Tests
│   └── FlightPayment.test.js
├── index.html               # Página principal
├── hardhat.config.js        # Configuración de Hardhat
├── package.json             # Dependencias
└── README.md               # Documentación
```

## 🔧 Comandos Disponibles

### Desarrollo
- `npm start` - Iniciar servidor local
- `npm run compile` - Compilar contratos
- `npm test` - Ejecutar tests
- `npm run check` - Verificar configuración

### Despliegue
- `npm run deploy:testnet` - Desplegar en testnet
- `npm run deploy` - Desplegar en mainnet
- `npm run verify` - Verificar contratos

### Administración
- `npm run admin` - Panel de administración
- `npm run admin:flights` - Gestión de vuelos
- `npm run admin:promotions` - Gestión de promociones
- `npm run admin:balance` - Ver balance del contrato
- `npm run admin:withdraw` - Retirar fondos

### Utilidades
- `npm run setup` - Configuración completa
- `npm run dev-setup` - Configuración de desarrollo
- `npm run clean` - Limpiar archivos generados
- `npm run reset` - Reset completo del proyecto

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests específicos
npx hardhat test test/FlightPayment.test.js

# Ejecutar tests con coverage
npx hardhat coverage
```

## 🔒 Seguridad

### Smart Contracts
- Contratos auditados y verificados
- Uso de OpenZeppelin para seguridad
- Validación de inputs
- Manejo seguro de fondos

### Frontend
- Validación de transacciones
- Verificación de red
- Manejo seguro de claves privadas
- Protección contra ataques comunes

### Recomendaciones
- Nunca compartas tu clave privada
- Usa wallets dedicadas para testing
- Verifica siempre las transacciones
- Mantén actualizadas las dependencias

## 🚨 Solución de Problemas

### Errores Comunes

**Error: "MetaMask no está instalado"**
- Instala MetaMask desde [metamask.io](https://metamask.io)
- Asegúrate de que esté habilitado en tu navegador

**Error: "Red incorrecta"**
- Cambia a Arbitrum en MetaMask
- La aplicación te ayudará a agregar la red si no está configurada

**Error: "Saldo insuficiente"**
- Asegúrate de tener ETH para gas en Arbitrum
- Para testnet, obtén ETH de: https://faucet.quicknode.com/arbitrum/sepolia

**Error: "Contratos no encontrados"**
- Ejecuta `npm run compile`
- Verifica que deployment.json tenga las direcciones correctas

### Verificación de Configuración

```bash
# Verificar configuración completa
npm run check

# Verificar dependencias
npm list

# Verificar compilación
npm run compile
```

## 📚 Recursos Adicionales

- [Documentación de Arbitrum](https://developer.arbitrum.io/)
- [Documentación de MetaMask](https://docs.metamask.io/)
- [Documentación de Ethers.js](https://docs.ethers.io/)
- [Documentación de Hardhat](https://hardhat.org/docs)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [FlyMXNB Community](https://discord.gg/flymxnb)
- **Email**: support@flymxnb.com

## 🗺️ Roadmap

- [ ] Integración con más aerolíneas
- [ ] Sistema de reembolsos
- [ ] App móvil
- [ ] Integración con más redes
- [ ] Sistema de fidelización
- [ ] API pública
- [ ] Dashboard de analytics

---

**FlyMXNB** - Revolucionando los pagos de vuelos con blockchain 🚀✈️ 
