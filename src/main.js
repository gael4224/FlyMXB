// Verificación de ethers.js
if (typeof ethers === 'undefined') {
    alert('Error: ethers.js no está cargado. Revisa tu conexión a internet o el orden de los scripts.');
    throw new Error('ethers.js no está cargado');
}
// Configuración de la aplicación
const CONFIG = {
    ARBITRUM_CHAIN_ID: '0xa4b1', // 42161 en hexadecimal
    ARBITRUM_SEPOLIA_CHAIN_ID: '0x66eee', // 421614 en hexadecimal
    RPC_URLS: {
        arbitrum: 'https://arb1.arbitrum.io/rpc',
        'arbitrum-sepolia': 'https://sepolia-rollup.arbitrum.io/rpc'
    },
    EXPLORER_URLS: {
        arbitrum: 'https://arbiscan.io',
        'arbitrum-sepolia': 'https://sepolia.arbiscan.io'
    }
};

// Estado global de la aplicación
let appState = {
    provider: null,
    signer: null,
    contract: null,
    mxnbContract: null,
    userAddress: null,
    network: null,
    flights: [],
    promotions: [],
    userPayments: [],
    demoTickets: [], // Tickets generados en modo demo
    selectedFlightOptions: null, // Para la selección de vuelo en modo demo
    ticketHistory: [], // Historial de boletos
    showHistory: false, // Mostrar/ocultar historial
    lastSelectedFlight: null // Guardar el vuelo seleccionado para el ticket
};

// ABI simplificado para el contrato FlightPayment
const FLIGHT_PAYMENT_ABI = [
    "function getActiveFlights() external view returns (tuple(uint256 flightId, string origin, string destination, uint256 departureTime, uint256 price, uint256 tuaFee, bool isActive, uint256 availableSeats)[])",
    "function getActivePromotions() external view returns (tuple(uint256 promotionId, string name, uint256 discountPercentage, uint256 validUntil, bool isActive, uint256 maxUses, uint256 currentUses)[])",
    "function getUserPayments(address _user) external view returns (tuple(uint256 paymentId, address user, uint256 flightId, uint256 amount, uint256 discount, uint256 finalAmount, uint256 timestamp, bool isConfirmed, string ticketNumber)[])",
    "function payFlight(uint256 _flightId, uint256 _promotionId) external payable",
    "function registeredUsers(address) external view returns (bool)"
];

// ABI simplificado para el contrato MXNB
const MXNB_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)"
];

// Direcciones de contratos (se cargarán desde deployment.json)
let CONTRACT_ADDRESSES = {
    flightPayment: null,
    mxnbToken: null
};

// Vuelos demo extendidos y soporte para selección
const DEMO_FLIGHTS = [
    { origin: 'CDMX', destination: 'Cancún', airline: 'Volaris', services: [
        { name: '1 maleta 25kg', price: 0 },
        { name: 'Snack a bordo', price: 50 },
        { name: 'Selección de asiento', price: 100 },
        { name: 'WiFi', price: 120 }
    ], price: 1500, tuaFee: 250 },
    { origin: 'Guadalajara', destination: 'Monterrey', airline: 'Aeroméxico', services: [
        { name: '2 maletas 23kg', price: 0 },
        { name: 'Comida caliente', price: 80 },
        { name: 'Entretenimiento', price: 60 }
    ], price: 1200, tuaFee: 200 },
    { origin: 'Monterrey', destination: 'Tijuana', airline: 'VivaAerobus', services: [
        { name: '1 maleta 15kg', price: 0 },
        { name: 'Bebida', price: 30 },
        { name: 'Asiento estándar', price: 0 }
    ], price: 1800, tuaFee: 300 },
    { origin: 'CDMX', destination: 'Mérida', airline: 'Aeroméxico', services: [
        { name: '1 maleta 23kg', price: 0 },
        { name: 'Snack', price: 50 },
        { name: 'WiFi', price: 120 }
    ], price: 1600, tuaFee: 220 },
    { origin: 'Guadalajara', destination: 'Chihuahua', airline: 'Volaris', services: [
        { name: '1 maleta 20kg', price: 0 },
        { name: 'Bebida', price: 30 },
        { name: 'Asiento preferente', price: 150 }
    ], price: 1400, tuaFee: 210 },
    { origin: 'Tijuana', destination: 'CDMX', airline: 'VivaAerobus', services: [
        { name: '1 maleta 15kg', price: 0 },
        { name: 'Snack', price: 50 },
        { name: 'Entretenimiento', price: 60 }
    ], price: 1700, tuaFee: 280 },
    { origin: 'Monterrey', destination: 'Cancún', airline: 'Aeroméxico', services: [
        { name: '2 maletas 23kg', price: 0 },
        { name: 'Comida caliente', price: 80 },
        { name: 'WiFi', price: 120 }
    ], price: 1900, tuaFee: 320 },
    { origin: 'CDMX', destination: 'Oaxaca', airline: 'Volaris', services: [
        { name: '1 maleta 20kg', price: 0 },
        { name: 'Snack', price: 50 },
        { name: 'Selección de asiento', price: 100 }
    ], price: 1300, tuaFee: 180 }
];

// Promociones demo aleatorias
const DEMO_PROMOTIONS = [
    { name: 'Descuento Primavera', discountPercentage: 10, validUntil: Math.floor(Date.now() / 1000) + 86400 * 10, maxUses: 100, currentUses: 0 },
    { name: 'Vuela FlyMXB', discountPercentage: 15, validUntil: Math.floor(Date.now() / 1000) + 86400 * 5, maxUses: 50, currentUses: 0 },
    { name: 'Promo Fin de Semana', discountPercentage: 20, validUntil: Math.floor(Date.now() / 1000) + 86400 * 2, maxUses: 30, currentUses: 0 },
    { name: 'Viaja Seguro', discountPercentage: 5, validUntil: Math.floor(Date.now() / 1000) + 86400 * 20, maxUses: 200, currentUses: 0 }
];

// Elementos del DOM
const elements = {
    authSection: document.getElementById('auth-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    connectWallet: document.getElementById('connect-wallet'),
    disconnectWallet: document.getElementById('disconnect-wallet'),
    metamaskLogin: document.getElementById('metamask-login'),
    emailLoginForm: document.getElementById('email-login-form'),
    networkStatus: document.getElementById('network-status'),
    walletInfo: document.getElementById('wallet-info'),
    walletAddress: document.getElementById('wallet-address'),
    mxnbBalance: document.getElementById('mxnb-balance'),
    flightsGrid: document.getElementById('flights-grid'),
    promotionsList: document.getElementById('promotions-list'),
    ticketsList: document.getElementById('tickets-list'),
    paymentModal: document.getElementById('payment-modal'),
    paymentDetails: document.getElementById('payment-details'),
    confirmPayment: document.getElementById('confirm-payment'),
    closePaymentModal: document.getElementById('close-payment-modal'),
    cancelPayment: document.getElementById('cancel-payment'),
    successModal: document.getElementById('success-modal'),
    ticketNumber: document.getElementById('ticket-number'),
    closeSuccessModal: document.getElementById('close-success-modal'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// Utilidades
const utils = {
    formatAddress(address) {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },

    formatWeiToMxnb(wei) {
        return (wei / 1e18).toFixed(2);
    },

    formatWeiToMxnbWithDecimals(wei, decimals = 6) {
        return (wei / Math.pow(10, decimals)).toFixed(2);
    },

    formatDate(timestamp) {
        return new Date(timestamp * 1000).toLocaleString('es-MX');
    },

    showLoading() {
        elements.loadingOverlay.classList.remove('hidden');
    },

    hideLoading() {
        elements.loadingOverlay.classList.add('hidden');
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
};

// Web3 y MetaMask
class Web3Manager {
    constructor() {
        this.provider = null;
        this.signer = null;
    }

    async detectProvider() {
        if (typeof window.ethereum !== 'undefined') {
            return window.ethereum;
        }
        throw new Error('MetaMask no está instalado');
    }

    async connect() {
        try {
            this.provider = await this.detectProvider();
            
            // Solicitar conexión de cuentas
            const accounts = await this.provider.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No se seleccionó ninguna cuenta');
            }

            this.signer = new ethers.providers.Web3Provider(this.provider).getSigner();
            appState.userAddress = accounts[0];
            appState.provider = this.provider;
            appState.signer = this.signer;

            // Verificar red
            await this.checkNetwork();

            return accounts[0];
        } catch (error) {
            console.error('Error conectando a MetaMask:', error);
            throw error;
        }
    }

    async checkNetwork() {
        const chainId = await this.provider.request({ method: 'eth_chainId' });
        
        if (chainId === CONFIG.ARBITRUM_CHAIN_ID) {
            appState.network = 'arbitrum';
        } else if (chainId === CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID) {
            appState.network = 'arbitrum-sepolia';
        } else {
            await this.switchToArbitrum();
        }
    }

    async switchToArbitrum() {
        try {
            await this.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: CONFIG.ARBITRUM_CHAIN_ID }],
            });
            appState.network = 'arbitrum';
        } catch (switchError) {
            // Si Arbitrum no está configurado, agregarlo
            if (switchError.code === 4902) {
                await this.addArbitrumNetwork();
            } else {
                throw switchError;
            }
        }
    }

    async addArbitrumNetwork() {
        try {
            await this.provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: CONFIG.ARBITRUM_CHAIN_ID,
                    chainName: 'Arbitrum One',
                    nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    rpcUrls: [CONFIG.RPC_URLS.arbitrum],
                    blockExplorerUrls: [CONFIG.EXPLORER_URLS.arbitrum]
                }]
            });
            appState.network = 'arbitrum';
        } catch (error) {
            console.error('Error agregando red Arbitrum:', error);
            throw error;
        }
    }

    async disconnect() {
        this.provider = null;
        this.signer = null;
        appState.userAddress = null;
        appState.network = null;
        appState.contract = null;
        appState.mxnbContract = null;
    }
}

// Gestor de contratos
class ContractManager {
    constructor() {
        this.flightPaymentContract = null;
        this.mxnbContract = null;
    }

    async initializeContracts() {
        if (!appState.signer) {
            throw new Error('No hay signer disponible');
        }

        // Cargar direcciones de contratos
        await this.loadContractAddresses();

        // Inicializar contratos
        this.flightPaymentContract = new ethers.Contract(
            CONTRACT_ADDRESSES.flightPayment,
            FLIGHT_PAYMENT_ABI,
            appState.signer
        );

        this.mxnbContract = new ethers.Contract(
            CONTRACT_ADDRESSES.mxnbToken,
            MXNB_ABI,
            appState.signer
        );

        appState.contract = this.flightPaymentContract;
        appState.mxnbContract = this.mxnbContract;
    }

    async loadContractAddresses() {
        try {
            const response = await fetch('deployment.json');
            const deployment = await response.json();
            CONTRACT_ADDRESSES.flightPayment = deployment.flightPayment;
            CONTRACT_ADDRESSES.mxnbToken = deployment.mxnbToken;
        } catch (error) {
            console.error('Error cargando direcciones de contratos:', error);
            // Usar direcciones de prueba si no se puede cargar deployment.json
            CONTRACT_ADDRESSES.flightPayment = '0x0000000000000000000000000000000000000000';
            CONTRACT_ADDRESSES.mxnbToken = '0x0000000000000000000000000000000000000000';
        }
    }

    async getFlights() {
        // Generar vuelos demo a partir de la selección del usuario
        // Si no hay selección, mostrar todos los vuelos demo
        if (appState.selectedFlightOptions) {
            // Solo uno, con los datos seleccionados
            const f = appState.selectedFlightOptions;
            return [{
                flightId: Date.now().toString(),
                origin: f.origin,
                destination: f.destination,
                departureTime: f.departureTime,
                price: (f.price * 1e18).toString(),
                tuaFee: (f.tuaFee * 1e18).toString(),
                isActive: true,
                availableSeats: '20',
                airline: f.airline,
                services: f.services
            }];
        }
        // Mostrar todos los vuelos demo
        return DEMO_FLIGHTS.map((f, i) => ({
            flightId: (i + 1).toString(),
            origin: f.origin,
            destination: f.destination,
            departureTime: (Math.floor(Date.now() / 1000) + (i + 1) * 86400).toString(),
            price: (f.price * 1e18).toString(),
            tuaFee: (f.tuaFee * 1e18).toString(),
            isActive: true,
            availableSeats: (20 - i).toString(),
            airline: f.airline,
            services: f.services
        }));
    }

    async getPromotions() {
        // Promociones aleatorias para la demo
        const promos = [];
        const n = Math.floor(Math.random() * 3) + 1; // 1 a 3 promociones
        const shuffled = DEMO_PROMOTIONS.sort(() => 0.5 - Math.random());
        for (let i = 0; i < n; i++) {
            promos.push({
                promotionId: (i + 1).toString(),
                name: shuffled[i].name,
                discountPercentage: shuffled[i].discountPercentage.toString(),
                validUntil: shuffled[i].validUntil.toString(),
                isActive: true,
                maxUses: shuffled[i].maxUses.toString(),
                currentUses: shuffled[i].currentUses.toString()
            });
        }
        return promos;
    }

    async getUserPayments() {
        try {
            const payments = await this.flightPaymentContract.getUserPayments(appState.userAddress);
            return payments.map(payment => ({
                paymentId: payment.paymentId.toString(),
                user: payment.user,
                flightId: payment.flightId.toString(),
                amount: payment.amount.toString(),
                discount: payment.discount.toString(),
                finalAmount: payment.finalAmount.toString(),
                timestamp: payment.timestamp.toString(),
                isConfirmed: payment.isConfirmed,
                ticketNumber: payment.ticketNumber
            }));
        } catch (error) {
            console.error('Error obteniendo pagos del usuario:', error);
            return [];
        }
    }

    async payFlight(flightId, promotionId = 0) {
        // Modo demo: simular compra y ticket
        if (!appState.contract || CONTRACT_ADDRESSES.flightPayment === '0x0000000000000000000000000000000000000000') {
            const flight = appState.flights.find(f => f.flightId === flightId);
            if (!flight) throw new Error('Vuelo no encontrado');
            // Simular ticket
            const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const now = Math.floor(Date.now() / 1000);
            const finalAmount = (parseFloat(utils.formatWeiToMxnb(flight.price)) + parseFloat(utils.formatWeiToMxnb(flight.tuaFee))).toFixed(2);
            const ticket = {
                paymentId: Date.now().toString(),
                user: appState.userAddress || 'demo@flymxnb.com',
                flightId: flight.flightId,
                amount: flight.price,
                discount: '0',
                finalAmount: (parseFloat(flight.price) + parseFloat(flight.tuaFee)).toString(),
                timestamp: now.toString(),
                isConfirmed: true,
                ticketNumber,
                airline: flight.airline,
                services: flight.services
            };
            appState.demoTickets.push(ticket);
            return ticket;
        }
        try {
            const flight = appState.flights.find(f => f.flightId === flightId);
            if (!flight) {
                throw new Error('Vuelo no encontrado');
            }

            const totalCost = BigInt(flight.price) + BigInt(flight.tuaFee);
            let finalAmount = totalCost;

            // Aplicar promoción si existe
            if (promotionId > 0) {
                const promotion = appState.promotions.find(p => p.promotionId === promotionId);
                if (promotion) {
                    const discount = (totalCost * BigInt(promotion.discountPercentage)) / 100n;
                    finalAmount = totalCost - discount;
                }
            }

            const tx = await this.flightPaymentContract.payFlight(flightId, promotionId, {
                value: finalAmount
            });

            return await tx.wait();
        } catch (error) {
            console.error('Error procesando pago:', error);
            throw error;
        }
    }

    async getMxnbBalance() {
        // En modo demo, mostrar saldo ficticio
        if (!appState.contract || CONTRACT_ADDRESSES.mxnbToken === '0x0000000000000000000000000000000000000000') {
            return '1000.00';
        }
        try {
            const balance = await this.mxnbContract.balanceOf(appState.userAddress);
            const decimals = await this.mxnbContract.decimals();
            return utils.formatWeiToMxnbWithDecimals(balance, decimals);
        } catch (error) {
            console.error('Error obteniendo balance MXNB:', error);
            return '0.00';
        }
    }
}

// Gestor de UI
class UIManager {
    constructor() {
        this.contractManager = new ContractManager();
        this.web3Manager = new Web3Manager();
    }

    async initialize() {
        this.setupEventListeners();
        await this.checkExistingConnection();
    }

    setupEventListeners() {
        // Botones de autenticación
        elements.metamaskLogin.addEventListener('click', () => this.handleMetaMaskLogin());
        elements.emailLoginForm.addEventListener('submit', (e) => this.handleEmailLogin(e));
        elements.connectWallet.addEventListener('click', () => this.handleMetaMaskLogin());
        elements.disconnectWallet.addEventListener('click', () => this.handleDisconnect());

        // Modales
        elements.closePaymentModal.addEventListener('click', () => this.closePaymentModal());
        elements.cancelPayment.addEventListener('click', () => this.closePaymentModal());
        elements.closeSuccessModal.addEventListener('click', () => this.closeSuccessModal());
        elements.confirmPayment.addEventListener('click', () => this.confirmPayment());

        // Cerrar modales con clic fuera
        elements.paymentModal.addEventListener('click', (e) => {
            if (e.target === elements.paymentModal) {
                this.closePaymentModal();
            }
        });

        elements.successModal.addEventListener('click', (e) => {
            if (e.target === elements.successModal) {
                this.closeSuccessModal();
            }
        });
    }

    async checkExistingConnection() {
        if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await this.handleSuccessfulConnection(accounts[0]);
            }
        }
    }

    async handleMetaMaskLogin() {
        try {
            utils.showLoading();
            const address = await this.web3Manager.connect();
            await this.handleSuccessfulConnection(address);
            utils.showNotification('Conectado exitosamente a MetaMask', 'success');
        } catch (error) {
            console.error('Error en login MetaMask:', error);
            utils.showNotification('Error conectando a MetaMask: ' + error.message, 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async handleEmailLogin(event) {
        event.preventDefault();
        const email = event.target.email.value;
        
        try {
            utils.showLoading();
            // Simular generación de wallet (en producción usarías un servicio como Magic.link)
            const wallet = ethers.Wallet.createRandom();
            appState.userAddress = wallet.address;
            appState.signer = wallet.connect(new ethers.providers.JsonRpcProvider(CONFIG.RPC_URLS.arbitrum));
            
            await this.handleSuccessfulConnection(wallet.address);
            utils.showNotification('Wallet generada exitosamente', 'success');
        } catch (error) {
            console.error('Error en login por email:', error);
            utils.showNotification('Error generando wallet: ' + error.message, 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async handleSuccessfulConnection(address) {
        appState.userAddress = address;
        
        // Inicializar contratos
        await this.contractManager.initializeContracts();
        
        // Actualizar UI
        this.showDashboard();
        this.updateWalletInfo();
        
        // Cargar datos
        await this.loadDashboardData();
    }

    async handleDisconnect() {
        await this.web3Manager.disconnect();
        this.showAuthSection();
        utils.showNotification('Desconectado exitosamente', 'info');
    }

    showDashboard() {
        elements.authSection.classList.add('hidden');
        elements.dashboardSection.classList.remove('hidden');
        elements.networkStatus.classList.remove('hidden');
        elements.walletInfo.classList.remove('hidden');
        elements.connectWallet.classList.add('hidden');
        elements.disconnectWallet.classList.remove('hidden');
    }

    showAuthSection() {
        elements.authSection.classList.remove('hidden');
        elements.dashboardSection.classList.add('hidden');
        elements.networkStatus.classList.add('hidden');
        elements.walletInfo.classList.add('hidden');
        elements.connectWallet.classList.remove('hidden');
        elements.disconnectWallet.classList.add('hidden');
    }

    updateWalletInfo() {
        elements.walletAddress.textContent = utils.formatAddress(appState.userAddress);
        this.updateMxnbBalance();
    }

    async updateMxnbBalance() {
        const balance = await this.contractManager.getMxnbBalance();
        elements.mxnbBalance.textContent = `${balance} FlyMXB`;
    }

    async loadDashboardData() {
        try {
            utils.showLoading();
            
            // Cargar vuelos, promociones y pagos en paralelo
            const [flights, promotions, payments] = await Promise.all([
                this.contractManager.getFlights(),
                this.contractManager.getPromotions(),
                this.contractManager.getUserPayments()
            ]);

            appState.flights = flights;
            appState.promotions = promotions;
            appState.userPayments = payments;

            this.renderFlights();
            this.renderPromotions();
            this.renderTickets();
            
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            utils.showNotification('Error cargando datos', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderFlights() {
        elements.flightsGrid.innerHTML = '';
        // Agregar formulario de selección
        const form = document.createElement('form');
        form.className = 'mb-8 bg-white rounded-xl shadow-lg p-6';
        form.innerHTML = `
            <div class="flex flex-col space-y-4 mb-4">
                <div class="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 w-full">
                    <div class="flex-1 min-w-0">
                        <label class="block text-base font-semibold text-gray-800 mb-2">Origen</label>
                        <select id="select-origin" class="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-gray-900">
                            <option value="">Selecciona</option>
                            ${[...new Set(DEMO_FLIGHTS.map(f => f.origin))].map(o => `<option value="${o}">${o}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-1 min-w-0">
                        <label class="block text-base font-semibold text-gray-800 mb-2">Destino</label>
                        <select id="select-destination" class="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-gray-900">
                            <option value="">Selecciona</option>
                            ${[...new Set(DEMO_FLIGHTS.map(f => f.destination))].map(d => `<option value="${d}">${d}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-1 min-w-0">
                        <label class="block text-base font-semibold text-gray-800 mb-2">Aerolínea</label>
                        <select id="select-airline" class="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-gray-900">
                            <option value="">Selecciona</option>
                            ${[...new Set(DEMO_FLIGHTS.map(f => f.airline))].map(a => `<option value="${a}">${a}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 w-full">
                    <div class="flex-1 min-w-0">
                        <label class="block text-base font-semibold text-gray-800 mb-2">Fecha y hora</label>
                        <input id="select-datetime" type="datetime-local" class="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-gray-900" required />
                    </div>
                    <div class="flex-1 min-w-0">
                        <label class="block text-base font-semibold text-gray-800 mb-2">Cantidad de boletos</label>
                        <input id="select-quantity" type="number" min="1" max="5" value="1" class="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-gray-900" required />
                    </div>
                </div>
            </div>
            <div id="services-section" class="mb-4"></div>
            <div class="mb-4 text-right font-bold text-blue-700" id="total-preview"></div>
            <button type="submit" class="promo-banner text-white py-3 px-4 rounded-lg font-medium transition-colors w-full shadow-lg border-2 border-blue-400">Buscar vuelo</button>
        `;
        // Servicios dinámicos
        const updateServices = () => {
            const origin = form.querySelector('#select-origin').value;
            const destination = form.querySelector('#select-destination').value;
            const airline = form.querySelector('#select-airline').value;
            const quantity = Math.max(1, Math.min(5, parseInt(form.querySelector('#select-quantity').value)));
            const found = DEMO_FLIGHTS.find(f => f.origin === origin && f.destination === destination && f.airline === airline);
            const section = form.querySelector('#services-section');
            if (!found) {
                section.innerHTML = '';
                form.querySelector('#total-preview').innerText = '';
                return;
            }
            section.innerHTML = `<label class='block text-sm font-medium text-gray-700 mb-2'>Servicios a elegir:</label>
                <div class='flex flex-wrap gap-2'>
                    ${found.services.map((s, i) => `
                        <label class='flex items-center gap-1 bg-gray-100 px-2 py-1 rounded'>
                            <input type='checkbox' class='service-checkbox' data-index='${i}' ${s.price === 0 ? 'checked disabled' : ''} />
                            ${s.name} ${s.price > 0 ? `(+${s.price} FlyMXB)` : ''}
                        </label>
                    `).join('')}
                </div>`;
            // Calcular total
            const calcTotal = () => {
                let total = found.price + found.tuaFee;
                section.querySelectorAll('.service-checkbox').forEach((cb, i) => {
                    if (cb.checked) total += found.services[i].price;
                });
                total = total * quantity;
                form.querySelector('#total-preview').innerText = `Total estimado: ${total} FlyMXB`;
            };
            section.querySelectorAll('.service-checkbox').forEach(cb => cb.addEventListener('change', calcTotal));
            form.querySelector('#select-quantity').addEventListener('input', calcTotal);
            calcTotal();
        };
        form.querySelector('#select-origin').addEventListener('change', updateServices);
        form.querySelector('#select-destination').addEventListener('change', updateServices);
        form.querySelector('#select-airline').addEventListener('change', updateServices);
        form.onsubmit = (e) => {
            e.preventDefault();
            const origin = form.querySelector('#select-origin').value;
            const destination = form.querySelector('#select-destination').value;
            const airline = form.querySelector('#select-airline').value;
            const datetime = form.querySelector('#select-datetime').value;
            const quantity = Math.max(1, Math.min(5, parseInt(form.querySelector('#select-quantity').value)));
            const found = DEMO_FLIGHTS.find(f => f.origin === origin && f.destination === destination && f.airline === airline);
            if (!origin || !destination || !airline || !datetime || !quantity) {
                utils.showNotification('Selecciona todos los campos', 'error');
                return;
            }
            if (!found) {
                utils.showNotification('No hay vuelo demo con esa combinación', 'error');
                return;
            }
            // Servicios seleccionados
            const checked = Array.from(form.querySelectorAll('.service-checkbox')).map((cb, i) => cb.checked ? found.services[i] : null).filter(Boolean);
            // Guardar selección
            appState.selectedFlightOptions = {
                ...found,
                services: checked,
                departureTime: Math.floor(new Date(datetime).getTime() / 1000).toString(),
                quantity
            };
            this.loadDashboardData();
        };
        elements.flightsGrid.appendChild(form);
        // Mostrar vuelos (si no hay selección)
        if (!appState.selectedFlightOptions) {
            appState.flights.forEach(flight => {
                const flightCard = this.createFlightCard(flight);
                elements.flightsGrid.appendChild(flightCard);
            });
        } else {
            // Mostrar solo el vuelo seleccionado
            const flightCard = this.createFlightCard(appState.flights[0]);
            elements.flightsGrid.appendChild(flightCard);
        }
        // Botón para ver historial
        let historyBtn = document.getElementById('show-history-btn');
        if (!historyBtn) {
            historyBtn = document.createElement('button');
            historyBtn.id = 'show-history-btn';
            historyBtn.className = 'mt-4 mb-4 promo-banner text-white py-2 px-6 rounded-lg font-medium transition-colors w-full shadow-lg border-2 border-blue-400';
            historyBtn.innerText = appState.showHistory ? 'Ocultar historial' : 'Ver historial';
            historyBtn.onclick = () => {
                appState.showHistory = !appState.showHistory;
                this.renderHistory();
                historyBtn.innerText = appState.showHistory ? 'Ocultar historial' : 'Ver historial';
            };
            elements.flightsGrid.appendChild(historyBtn);
        }
    }

    createFlightCard(flight) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-lg p-6 card-hover';
        
        const departureDate = utils.formatDate(parseInt(flight.departureTime));
        const price = utils.formatWeiToMxnb(flight.price);
        const tuaFee = utils.formatWeiToMxnb(flight.tuaFee);
        const totalPrice = (parseFloat(price) + parseFloat(tuaFee)).toFixed(2);

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">${flight.origin} → ${flight.destination}</h3>
                    <p class="text-gray-600">${departureDate}</p>
                    <p class="text-sm text-gray-500 mt-1"><span class="font-semibold">Aerolínea:</span> ${flight.airline || 'Aerolínea'}</p>
                </div>
                <span class="flex items-center justify-center bg-blue-500 text-blue-100 px-3 py-1 rounded-full text-sm font-medium w-full" style="max-width: 120px; margin: 0 auto;">
                    ${flight.availableSeats} asientos
                </span>
            </div>
            
            <div class="space-y-2 mb-4">
                <div class="flex justify-between">
                    <span class="text-gray-600">Precio del vuelo:</span>
                    <span class="font-medium">${price} FlyMXB</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">TUA:</span>
                    <span class="font-medium">${tuaFee} FlyMXB</span>
                </div>
                <div class="flex justify-between border-t pt-2">
                    <span class="font-bold text-gray-800">Total:</span>
                    <span class="font-bold text-blue-600">${totalPrice} FlyMXB</span>
                </div>
                <div class="mt-2">
                    <span class="text-gray-600 font-semibold">Servicios incluidos:</span>
                    <ul class="list-disc list-inside text-gray-500 text-sm">
                        ${(flight.services || []).map(s => `<li>${s.name || s}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <button class="w-full btn-primary text-white py-3 px-4 rounded-lg font-medium transition-colors shadow-lg border-2 border-blue-700"
                    onclick="uiManager.openPaymentModal('${flight.flightId}')">
                Pagar 
            </button>
        `;

        return card;
    }

    renderPromotions() {
        elements.promotionsList.innerHTML = '';
        
        appState.promotions.forEach(promotion => {
            const promotionCard = this.createPromotionCard(promotion);
            elements.promotionsList.appendChild(promotionCard);
        });
    }

    createPromotionCard(promotion) {
        const card = document.createElement('div');
        card.className = 'bg-white bg-opacity-20 rounded-lg p-4';
        
        const validUntil = utils.formatDate(parseInt(promotion.validUntil));
        const remainingUses = parseInt(promotion.maxUses) - parseInt(promotion.currentUses);

        card.innerHTML = `
            <h4 class="font-bold text-lg mb-2">${promotion.name}</h4>
            <p class="text-sm mb-2">${promotion.discountPercentage}% de descuento</p>
            <p class="text-xs opacity-75">Válido hasta: ${validUntil}</p>
            <p class="text-xs opacity-75">Usos restantes: ${remainingUses}</p>
        `;

        return card;
    }

    renderTickets() {
        elements.ticketsList.innerHTML = '';
        // Mostrar solo el último ticket comprado (si hay selección)
        let tickets = (appState.userPayments && appState.userPayments.length > 0) ? appState.userPayments : appState.demoTickets;
        if (appState.selectedFlightOptions && tickets.length > 0) {
            tickets = [tickets[tickets.length - 1]];
        }
        if (!tickets || tickets.length === 0) {
            elements.ticketsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No tienes boletos aún</p>
                    <p class="text-sm">¡Reserva tu primer vuelo con FlyMXB!</p>
                </div>
            `;
            return;
        }
        // Mostrar solo un boleto con la cantidad
        const payment = tickets[tickets.length - 1];
        const ticketCard = this.createTicketCard(payment, tickets.length - 1);
        elements.ticketsList.appendChild(ticketCard);
    }
    createTicketCard(payment, idx) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row justify-between items-center gap-4';
        const flight = appState.flights.find(f => f.flightId === payment.flightId) || payment;
        const departureDate = flight ? utils.formatDate(parseInt(flight.departureTime)) : 'N/A';
        const finalAmount = utils.formatWeiToMxnb(payment.finalAmount);
        const paymentDate = utils.formatDate(parseInt(payment.timestamp));
        const quantity = payment.quantity || 1;
        // Determinar si el boleto fue pagado con MXNB
        const isMxnb = !payment.paymentMethod || payment.paymentMethod === 'mxnb';
        card.innerHTML = `
            <div class="flex-1">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-lg">${flight ? `${flight.origin} → ${flight.destination}` : 'Vuelo'}</h4>
                        <p class="text-gray-600">${departureDate}</p>
                        <p class="text-sm text-gray-500 mt-1"><span class="font-semibold">Aerolínea:</span> ${flight.airline || 'Aerolínea'}</p>
                    </div>
                    <span class="flex items-center justify-center bg-blue-500 text-blue-100 px-3 py-1 rounded-full text-sm font-medium w-full" style="max-width: 120px; margin: 0 auto;">
                        Confirmado
                    </span>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">Cantidad: ${quantity}</span>
                </div>
                <div class="space-y-2 mb-4">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Número de boleto:</span>
                        <span class="font-mono text-sm">${payment.ticketNumber}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Monto pagado:</span>
                        <span class="font-bold text-blue-600">${finalAmount} FlyMXB</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Fecha de pago:</span>
                        <span class="text-sm">${paymentDate}</span>
                    </div>
                    <div class="mt-2">
                        <span class="text-gray-600 font-semibold">Servicios incluidos:</span>
                        <ul class="list-disc list-inside text-gray-500 text-sm">
                            ${(flight.services || []).map(s => `<li>${s.name || s}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="flex flex-col md:flex-row gap-2 mt-4">
                    <button class="w-full promo-banner text-white py-2 px-4 rounded-lg font-medium transition-colors shadow-lg border-2 border-blue-400" onclick='uiManager.openQRModal(${JSON.stringify({
    ticketNumber: payment.ticketNumber,
    user: payment.user,
    flight: {
        origin: flight.origin,
        destination: flight.destination,
        departureTime: flight.departureTime,
        airline: flight.airline,
        services: (flight.services || []).map(s => s.name || s)
    },
    amount: finalAmount,
    date: paymentDate,
    quantity
})})'>Ver QR del Boleto</button>
                    <button class="w-full promo-banner text-white py-2 px-4 rounded-lg font-medium transition-colors shadow-lg border-2 border-blue-400" onclick="uiManager.deleteTicket(${idx})">Eliminar</button>
                    <button class="w-full promo-banner text-white py-2 px-4 rounded-lg font-medium transition-colors shadow-lg border-2 border-blue-400" onclick="uiManager.moveToHistory(${idx})">Mover a historial</button>
                    ${isMxnb ? `<button class="w-full promo-banner text-white py-2 px-4 rounded-lg font-medium transition-colors shadow-lg border-2 border-blue-400" onclick="uiManager.refundTUA(${idx})">Reportar vuelo perdido (Reembolso TUA)</button>` : ''}
                </div>
            </div>
        `;
        return card;
    }
    deleteTicket(idx) {
        let tickets = (appState.userPayments && appState.userPayments.length > 0) ? appState.userPayments : appState.demoTickets;
        tickets.splice(idx, 1);
        this.renderTickets();
    }
    moveToHistory(idx) {
        let tickets = (appState.userPayments && appState.userPayments.length > 0) ? appState.userPayments : appState.demoTickets;
        const ticket = tickets.splice(idx, 1)[0];
        appState.ticketHistory.push({ ...ticket, status: 'historial' });
        this.renderTickets();
        this.renderHistory();
    }
    refundTUA(idx) {
        let tickets = (appState.userPayments && appState.userPayments.length > 0) ? appState.userPayments : appState.demoTickets;
        const ticket = tickets.splice(idx, 1)[0];
        appState.ticketHistory.push({ ...ticket, status: 'reembolsado', refund: utils.formatWeiToMxnb(ticket.tuaFee) });
        this.renderTickets();
        this.renderHistory();
        utils.showNotification(`Se ha reembolsado la TUA: ${utils.formatWeiToMxnb(ticket.tuaFee)} FlyMXB`, 'success');
    }
    renderHistory() {
        let historySection = document.getElementById('history-section');
        if (!historySection) {
            historySection = document.createElement('div');
            historySection.id = 'history-section';
            historySection.className = 'mb-8';
            const main = document.querySelector('main');
            main.appendChild(historySection);
        }
        if (!appState.showHistory) {
            historySection.innerHTML = '';
            historySection.style.display = 'none';
            return;
        }
        historySection.style.display = '';
        historySection.innerHTML = `<h2 class="text-3xl font-bold text-gray-800 mb-6">Historial de Boletos</h2>`;
        if (!appState.ticketHistory || appState.ticketHistory.length === 0) {
            historySection.innerHTML += `<div class="text-center py-8 text-gray-500">No hay boletos en el historial.</div>`;
            return;
        }
        // Mostrar todos los boletos en el historial
        appState.ticketHistory.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg shadow-md p-6 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-300';
            const flight = ticket;
            const departureDate = flight ? utils.formatDate(parseInt(flight.departureTime)) : 'N/A';
            const finalAmount = utils.formatWeiToMxnb(ticket.finalAmount);
            const paymentDate = utils.formatDate(parseInt(ticket.timestamp));
            const quantity = ticket.quantity || 1;
            card.innerHTML = `
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-bold text-lg text-gray-800">${flight ? `${flight.origin} → ${flight.destination}` : 'Vuelo'}</h4>
                            <p class="text-gray-600">${departureDate}</p>
                            <p class="text-sm text-gray-500 mt-1"><span class="font-semibold">Aerolínea:</span> ${flight.airline || 'Aerolínea'}</p>
                        </div>
                        <span class="${ticket.status === 'reembolsado' ? 'bg-green-200 text-green-800' : 'bg-gray-300 text-gray-800'} px-2 py-1 rounded-full text-sm font-medium">
                            ${ticket.status === 'reembolsado' ? 'Reembolsado TUA' : 'Historial'}
                        </span>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">Cantidad: ${quantity}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        <div>
                            <span class="block text-gray-600 font-medium">Número de boleto:</span>
                            <span class="font-mono text-sm">${ticket.ticketNumber}</span>
                        </div>
                        <div>
                            <span class="block text-gray-600 font-medium">Monto pagado:</span>
                            <span class="font-bold text-blue-600">${finalAmount} FlyMXB</span>
                        </div>
                        <div>
                            <span class="block text-gray-600 font-medium">Fecha de pago:</span>
                            <span class="text-sm">${paymentDate}</span>
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="text-gray-600 font-semibold">Servicios incluidos:</span>
                        <ul class="list-disc list-inside text-gray-500 text-sm">
                            ${(flight.services || []).map(s => `<li>${s.name || s}</li>`).join('')}
                        </ul>
                    </div>
                    ${ticket.status === 'reembolsado' ? `<div class='text-green-700 font-bold mt-2'>Reembolso TUA: ${ticket.refund} FlyMXB</div>` : ''}
                </div>
            `;
            historySection.appendChild(card);
        });
    }

    openPaymentModal(flightId) {
        const flight = appState.flights.find(f => f.flightId === flightId);
        if (!flight) return;
        appState.lastSelectedFlight = { ...flight }; // Guardar copia completa

        const price = utils.formatWeiToMxnb(flight.price);
        const tuaFee = utils.formatWeiToMxnb(flight.tuaFee);
        const quantity = appState.selectedFlightOptions?.quantity || 1;
        const totalPrice = ((parseFloat(price) + parseFloat(tuaFee)) * quantity).toFixed(2);

        // Métodos de pago
        const paymentMethods = [
            { value: 'mxnb', label: 'MXNB (Recomendado, aplica promociones)' },
            { value: 'card', label: 'Tarjeta de crédito/débito' },
            { value: 'paypal', label: 'PayPal' },
            { value: 'oxxo', label: 'Oxxo/Transferencia' }
        ];

        elements.paymentDetails.innerHTML = `
            <div class="space-y-4">
                <div class="text-center">
                    <h4 class="font-bold text-lg">${flight.origin} → ${flight.destination}</h4>
                    <p class="text-gray-600">${utils.formatDate(parseInt(flight.departureTime))}</p>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Precio del vuelo:</span>
                        <span class="font-medium">${price} FlyMXB</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">TUA:</span>
                        <span class="font-medium">${tuaFee} FlyMXB</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Cantidad de boletos:</span>
                        <span class="font-medium">${quantity}</span>
                    </div>
                    <div class="flex justify-between border-t pt-2">
                        <span class="font-bold text-gray-800">Total a pagar:</span>
                        <span class="font-bold text-blue-600" id="total-price-label">${totalPrice} FlyMXB</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Método de pago:</label>
                    <select id="payment-method-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        ${paymentMethods.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
                    </select>
                </div>
                <div id="promo-section"></div>
            </div>
        `;

        // Render promociones si es MXNB
        const renderPromos = () => {
            const method = document.getElementById('payment-method-select').value;
            const promoSection = document.getElementById('promo-section');
            if (method === 'mxnb' && appState.promotions.length > 0) {
                promoSection.innerHTML = `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Aplicar promoción:</label>
                        <select id="promotion-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="0">Sin promoción</option>
                            ${appState.promotions.map(p => `
                                <option value="${p.promotionId}">${p.name} (${p.discountPercentage}% descuento)</option>
                            `).join('')}
                        </select>
                    </div>
                `;
            } else if (method !== 'mxnb') {
                promoSection.innerHTML = `<div class='text-yellow-700 bg-yellow-100 rounded p-2 text-center mt-2'>Las promociones solo aplican image.pngndo con MXNB.</div>`;
            } else {
                promoSection.innerHTML = '';
            }
        };
        setTimeout(renderPromos, 0);
        setTimeout(() => {
            document.getElementById('payment-method-select').addEventListener('change', () => {
                renderPromos();
            });
        }, 0);

        elements.paymentModal.classList.remove('hidden');
        this.selectedFlightId = flightId;
    }

    closePaymentModal() {
        elements.paymentModal.classList.add('hidden');
        this.selectedFlightId = null;
    }

    closeSuccessModal() {
        elements.successModal.classList.add('hidden');
    }

    async confirmPayment() {
        if (!this.selectedFlightId) return;
        const paymentMethod = document.getElementById('payment-method-select')?.value || 'mxnb';
        const promotionSelect = document.getElementById('promotion-select');
        const promotionId = promotionSelect ? promotionSelect.value : '0';
        try {
            utils.showLoading();
            if (paymentMethod === 'mxnb') {
                const receipt = await this.contractManager.payFlight(this.selectedFlightId, promotionId);
                this.closePaymentModal();
                if (receipt && receipt.ticketNumber) {
                    receipt.quantity = appState.selectedFlightOptions?.quantity || 1;
                    receipt.paymentMethod = 'mxnb';
                    // Sobrescribir datos del ticket con los del vuelo seleccionado
                    const f = appState.lastSelectedFlight || {};
                    receipt.origin = f.origin;
                    receipt.destination = f.destination;
                    receipt.departureTime = f.departureTime;
                    receipt.airline = f.airline;
                    receipt.services = f.services;
                    this.showSuccessModal(receipt);
                    appState.demoTickets = appState.demoTickets || [];
                    appState.demoTickets.push(receipt);
                    appState.selectedFlightOptions = null;
                    this.renderTickets();
                } else {
                    this.showSuccessModal(receipt);
                    await this.loadDashboardData();
                    await this.updateMxnbBalance();
                }
                utils.showNotification('Pago procesado exitosamente', 'success');
            } else {
                // Simular pago con otros métodos
                setTimeout(() => {
                    this.closePaymentModal();
                    // Usar el vuelo guardado para poblar todos los campos
                    const f = appState.lastSelectedFlight || {};
                    const selected = appState.selectedFlightOptions || {};
                    const quantity = selected.quantity || 1;
                    const price = f.price ? parseFloat(utils.formatWeiToMxnb(f.price)) : 0;
                    const tuaFee = f.tuaFee ? parseFloat(utils.formatWeiToMxnb(f.tuaFee)) : 0;
                    const finalAmount = ((price + tuaFee) * quantity).toFixed(2);
                    const fakeTicket = {
                        paymentId: Date.now().toString(),
                        user: appState.userAddress || 'demo@flymxnb.com',
                        flightId: this.selectedFlightId,
                        origin: f.origin || '',
                        destination: f.destination || '',
                        departureTime: f.departureTime || '',
                        price: f.price || '0',
                        tuaFee: f.tuaFee || '0',
                        amount: (price + tuaFee).toString(),
                        discount: '0',
                        finalAmount: (parseFloat(finalAmount) * 1e18).toString(),
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        isConfirmed: true,
                        ticketNumber: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                        airline: f.airline || '',
                        services: f.services || [],
                        quantity,
                        paymentMethod
                    };
                    appState.demoTickets = appState.demoTickets || [];
                    appState.demoTickets.push(fakeTicket);
                    appState.selectedFlightOptions = null;
                    this.renderTickets();
                    utils.showNotification('Pago simulado exitosamente con ' + paymentMethod.toUpperCase(), 'success');
                }, 1200);
            }
        } catch (error) {
            console.error('Error confirmando pago:', error);
            utils.showNotification('Error procesando pago: ' + error.message, 'error');
        } finally {
            utils.hideLoading();
        }
    }

    showSuccessModal(receipt) {
        // Si es demo, mostrar QR con datos del ticket
        if (receipt && receipt.ticketNumber) {
            this.generateTicketQRJSON({
                ticketNumber: receipt.ticketNumber,
                user: receipt.user,
                flight: {
                    origin: appState.flights.find(f => f.flightId === receipt.flightId)?.origin,
                    destination: appState.flights.find(f => f.flightId === receipt.flightId)?.destination,
                    departureTime: appState.flights.find(f => f.flightId === receipt.flightId)?.departureTime,
                    airline: appState.flights.find(f => f.flightId === receipt.flightId)?.airline,
                    services: appState.flights.find(f => f.flightId === receipt.flightId)?.services
                },
                amount: utils.formatWeiToMxnb(receipt.finalAmount),
                date: utils.formatDate(parseInt(receipt.timestamp))
            });
        } else {
            // Generar número de ticket (simulado)
            const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            elements.ticketNumber.textContent = `Número de boleto: ${ticketNumber}`;
            this.generateTicketQR(ticketNumber);
        }
        elements.successModal.classList.remove('hidden');
    }

    // Generar QR con los datos del ticket (JSON)
    generateTicketQRJSON(ticketData) {
        const qrContainer = document.getElementById('ticket-qr');
        qrContainer.innerHTML = '';
        const qrText = typeof ticketData === 'string' ? ticketData : JSON.stringify(ticketData);
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(qrContainer, qrText, {
                width: 200,
                height: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }, function (error) {
                if (error) {
                    console.error(error);
                }
            });
        }
        elements.successModal.classList.remove('hidden');
        elements.ticketNumber.textContent = `Número de boleto: ${ticketData.ticketNumber || ''}`;
    }

    openQRModal(ticketData) {
        const modal = document.getElementById('qr-modal');
        const qrContainer = document.getElementById('qr-modal-qr');
        const ticketNumberDiv = document.getElementById('qr-modal-ticket-number');
        qrContainer.innerHTML = '';
        ticketNumberDiv.textContent = `Número de boleto: ${ticketData.ticketNumber || ''}`;
        modal.classList.remove('hidden');
        setTimeout(() => {
            const qrText = typeof ticketData === 'string' ? ticketData : JSON.stringify(ticketData);
            if (typeof QRCode !== 'undefined') {
                // Crear canvas y renderizar QR
                const canvas = document.createElement('canvas');
                qrContainer.appendChild(canvas);
                QRCode.toCanvas(canvas, qrText, {
                    width: 200,
                    height: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }, function (error) {
                    if (error) {
                        console.error(error);
                    }
                });
            }
        }, 100);
    }
}

// Inicializar aplicación
let uiManager;

document.addEventListener('DOMContentLoaded', async () => {
    uiManager = new UIManager();
    await uiManager.initialize();
    
    // Asegura el cierre del modal QR
    const closeQRBtn = document.getElementById('close-qr-modal');
    if (closeQRBtn) {
        closeQRBtn.addEventListener('click', function() {
            document.getElementById('qr-modal').classList.add('hidden');
        });
    }
    console.log('🚀 FlyMXB iniciado correctamente');
});

// Exponer para uso global
window.uiManager = uiManager; 