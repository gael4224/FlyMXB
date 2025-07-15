// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title FlightPayment
 * @dev Contrato para procesar pagos de vuelos con MXNB sobre Arbitrum
 */
contract FlightPayment is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    // Estructuras de datos
    struct Flight {
        uint256 flightId;
        string origin;
        string destination;
        uint256 departureTime;
        uint256 price;
        uint256 tuaFee;
        bool isActive;
        uint256 availableSeats;
    }

    struct Payment {
        uint256 paymentId;
        address user;
        uint256 flightId;
        uint256 amount;
        uint256 discount;
        uint256 finalAmount;
        uint256 timestamp;
        bool isConfirmed;
        string ticketNumber;
    }

    struct Promotion {
        uint256 promotionId;
        string name;
        uint256 discountPercentage;
        uint256 validUntil;
        bool isActive;
        uint256 maxUses;
        uint256 currentUses;
    }

    // Variables de estado
    Counters.Counter private _paymentIds;
    Counters.Counter private _promotionIds;
    
    mapping(uint256 => Flight) public flights;
    mapping(uint256 => Payment) public payments;
    mapping(uint256 => Promotion) public promotions;
    mapping(address => uint256[]) public userPayments;
    mapping(address => bool) public registeredUsers;
    mapping(string => bool) public usedTicketNumbers;
    
    // Eventos
    event FlightCreated(uint256 indexed flightId, string origin, string destination, uint256 price);
    event PaymentProcessed(uint256 indexed paymentId, address indexed user, uint256 flightId, uint256 amount);
    event PromotionCreated(uint256 indexed promotionId, string name, uint256 discountPercentage);
    event UserRegistered(address indexed user);
    event TicketGenerated(uint256 indexed paymentId, string ticketNumber);

    // Modificadores
    modifier flightExists(uint256 _flightId) {
        require(flights[_flightId].isActive, "Flight does not exist or is inactive");
        _;
    }

    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "Amount must be greater than 0");
        _;
    }

    // Constructor
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Crear un nuevo vuelo (solo owner)
     */
    function createFlight(
        string memory _origin,
        string memory _destination,
        uint256 _departureTime,
        uint256 _price,
        uint256 _tuaFee,
        uint256 _availableSeats
    ) external onlyOwner {
        uint256 flightId = _paymentIds.current();
        flights[flightId] = Flight({
            flightId: flightId,
            origin: _origin,
            destination: _destination,
            departureTime: _departureTime,
            price: _price,
            tuaFee: _tuaFee,
            isActive: true,
            availableSeats: _availableSeats
        });
        
        emit FlightCreated(flightId, _origin, _destination, _price);
    }

    /**
     * @dev Procesar pago de vuelo con MXNB
     */
    function payFlight(
        uint256 _flightId,
        uint256 _promotionId
    ) external payable nonReentrant flightExists(_flightId) validAmount(msg.value) {
        Flight storage flight = flights[_flightId];
        require(flight.availableSeats > 0, "No available seats");
        
        uint256 totalCost = flight.price + flight.tuaFee;
        uint256 discount = 0;
        
        // Aplicar promoción si existe y es válida
        if (_promotionId > 0 && promotions[_promotionId].isActive) {
            Promotion storage promotion = promotions[_promotionId];
            require(block.timestamp <= promotion.validUntil, "Promotion expired");
            require(promotion.currentUses < promotion.maxUses, "Promotion usage limit reached");
            
            discount = (totalCost * promotion.discountPercentage) / 100;
            promotion.currentUses++;
        }
        
        uint256 finalAmount = totalCost - discount;
        require(msg.value >= finalAmount, "Insufficient payment amount");
        
        // Registrar usuario si no existe
        if (!registeredUsers[msg.sender]) {
            registeredUsers[msg.sender] = true;
            emit UserRegistered(msg.sender);
        }
        
        // Crear pago
        _paymentIds.increment();
        uint256 paymentId = _paymentIds.current();
        
        string memory ticketNumber = _generateTicketNumber(paymentId);
        
        payments[paymentId] = Payment({
            paymentId: paymentId,
            user: msg.sender,
            flightId: _flightId,
            amount: totalCost,
            discount: discount,
            finalAmount: finalAmount,
            timestamp: block.timestamp,
            isConfirmed: true,
            ticketNumber: ticketNumber
        });
        
        userPayments[msg.sender].push(paymentId);
        flight.availableSeats--;
        usedTicketNumbers[ticketNumber] = true;
        
        emit PaymentProcessed(paymentId, msg.sender, _flightId, finalAmount);
        emit TicketGenerated(paymentId, ticketNumber);
        
        // Reembolsar exceso si existe
        if (msg.value > finalAmount) {
            payable(msg.sender).transfer(msg.value - finalAmount);
        }
    }

    /**
     * @dev Crear promoción (solo owner)
     */
    function createPromotion(
        string memory _name,
        uint256 _discountPercentage,
        uint256 _validUntil,
        uint256 _maxUses
    ) external onlyOwner {
        require(_discountPercentage <= 50, "Discount cannot exceed 50%");
        require(_validUntil > block.timestamp, "Valid until must be in the future");
        
        _promotionIds.increment();
        uint256 promotionId = _promotionIds.current();
        
        promotions[promotionId] = Promotion({
            promotionId: promotionId,
            name: _name,
            discountPercentage: _discountPercentage,
            validUntil: _validUntil,
            isActive: true,
            maxUses: _maxUses,
            currentUses: 0
        });
        
        emit PromotionCreated(promotionId, _name, _discountPercentage);
    }

    /**
     * @dev Obtener vuelos activos
     */
    function getActiveFlights() external view returns (Flight[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _paymentIds.current(); i++) {
            if (flights[i].isActive) {
                activeCount++;
            }
        }
        
        Flight[] memory activeFlights = new Flight[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < _paymentIds.current(); i++) {
            if (flights[i].isActive) {
                activeFlights[index] = flights[i];
                index++;
            }
        }
        
        return activeFlights;
    }

    /**
     * @dev Obtener pagos de un usuario
     */
    function getUserPayments(address _user) external view returns (Payment[] memory) {
        uint256[] memory userPaymentIds = userPayments[_user];
        Payment[] memory userPaymentList = new Payment[](userPaymentIds.length);
        
        for (uint256 i = 0; i < userPaymentIds.length; i++) {
            userPaymentList[i] = payments[userPaymentIds[i]];
        }
        
        return userPaymentList;
    }

    /**
     * @dev Obtener promociones activas
     */
    function getActivePromotions() external view returns (Promotion[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= _promotionIds.current(); i++) {
            if (promotions[i].isActive && block.timestamp <= promotions[i].validUntil) {
                activeCount++;
            }
        }
        
        Promotion[] memory activePromotions = new Promotion[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= _promotionIds.current(); i++) {
            if (promotions[i].isActive && block.timestamp <= promotions[i].validUntil) {
                activePromotions[index] = promotions[i];
                index++;
            }
        }
        
        return activePromotions;
    }

    /**
     * @dev Generar número de ticket único
     */
    function _generateTicketNumber(uint256 _paymentId) internal pure returns (string memory) {
        return string(abi.encodePacked("TKT-", _toString(_paymentId), "-", _toString(block.timestamp)));
    }

    /**
     * @dev Convertir uint256 a string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Retirar fondos (solo owner)
     */
    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Obtener balance del contrato
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
} 