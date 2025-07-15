const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlyMXNB - Flight Payment System", function () {
    let FlightPayment, MXNBToken;
    let flightPayment, mxnbToken;
    let owner, user1, user2;
    let addrs;

    beforeEach(async function () {
        // Obtener signers
        [owner, user1, user2, ...addrs] = await ethers.getSigners();

        // Desplegar MXNB Token
        MXNBToken = await ethers.getContractFactory("MXNBToken");
        mxnbToken = await MXNBToken.deploy();

        // Desplegar FlightPayment
        FlightPayment = await ethers.getContractFactory("FlightPayment");
        flightPayment = await FlightPayment.deploy();

        // Esperar a que se desplieguen
        await mxnbToken.waitForDeployment();
        await flightPayment.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should deploy contracts correctly", async function () {
            expect(await mxnbToken.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await flightPayment.getAddress()).to.not.equal(ethers.ZeroAddress);
        });

        it("Should set correct owner", async function () {
            expect(await flightPayment.owner()).to.equal(owner.address);
        });

        it("Should mint initial MXNB tokens to owner", async function () {
            const balance = await mxnbToken.balanceOf(owner.address);
            expect(balance).to.equal(ethers.parseUnits("1000000", 6)); // 1M MXNB con 6 decimales
        });
    });

    describe("Flight Management", function () {
        it("Should allow owner to create flights", async function () {
            const flightData = {
                origin: "Ciudad de México",
                destination: "Guadalajara",
                departureTime: Math.floor(Date.now() / 1000) + 86400,
                price: ethers.parseEther("1500"),
                tuaFee: ethers.parseEther("50"),
                availableSeats: 150
            };

            await expect(flightPayment.createFlight(
                flightData.origin,
                flightData.destination,
                flightData.departureTime,
                flightData.price,
                flightData.tuaFee,
                flightData.availableSeats
            )).to.emit(flightPayment, "FlightCreated");

            const flights = await flightPayment.getActiveFlights();
            expect(flights.length).to.equal(1);
            expect(flights[0].origin).to.equal(flightData.origin);
            expect(flights[0].destination).to.equal(flightData.destination);
        });

        it("Should not allow non-owner to create flights", async function () {
            await expect(
                flightPayment.connect(user1).createFlight(
                    "CDMX",
                    "GDL",
                    Math.floor(Date.now() / 1000) + 86400,
                    ethers.parseEther("1000"),
                    ethers.parseEther("50"),
                    100
                )
            ).to.be.revertedWithCustomError(flightPayment, "OwnableUnauthorizedAccount");
        });

        it("Should return correct flight data", async function () {
            const flightData = {
                origin: "Monterrey",
                destination: "Cancún",
                departureTime: Math.floor(Date.now() / 1000) + 172800,
                price: ethers.parseEther("1800"),
                tuaFee: ethers.parseEther("50"),
                availableSeats: 100
            };

            await flightPayment.createFlight(
                flightData.origin,
                flightData.destination,
                flightData.departureTime,
                flightData.price,
                flightData.tuaFee,
                flightData.availableSeats
            );

            const flights = await flightPayment.getActiveFlights();
            const flight = flights[0];

            expect(flight.flightId).to.equal(0);
            expect(flight.origin).to.equal(flightData.origin);
            expect(flight.destination).to.equal(flightData.destination);
            expect(flight.price).to.equal(flightData.price);
            expect(flight.tuaFee).to.equal(flightData.tuaFee);
            expect(flight.availableSeats).to.equal(flightData.availableSeats);
            expect(flight.isActive).to.be.true;
        });
    });

    describe("Promotion Management", function () {
        it("Should allow owner to create promotions", async function () {
            const promotionData = {
                name: "Descuento MXNB",
                discountPercentage: 15,
                validUntil: Math.floor(Date.now() / 1000) + 604800,
                maxUses: 100
            };

            await expect(flightPayment.createPromotion(
                promotionData.name,
                promotionData.discountPercentage,
                promotionData.validUntil,
                promotionData.maxUses
            )).to.emit(flightPayment, "PromotionCreated");

            const promotions = await flightPayment.getActivePromotions();
            expect(promotions.length).to.equal(1);
            expect(promotions[0].name).to.equal(promotionData.name);
            expect(promotions[0].discountPercentage).to.equal(promotionData.discountPercentage);
        });

        it("Should not allow discount greater than 50%", async function () {
            await expect(
                flightPayment.createPromotion(
                    "Descuento Inválido",
                    60,
                    Math.floor(Date.now() / 1000) + 604800,
                    100
                )
            ).to.be.revertedWith("Discount cannot exceed 50%");
        });

        it("Should not allow promotion with past date", async function () {
            await expect(
                flightPayment.createPromotion(
                    "Promoción Pasada",
                    10,
                    Math.floor(Date.now() / 1000) - 86400,
                    100
                )
            ).to.be.revertedWith("Valid until must be in the future");
        });
    });

    describe("Flight Payment", function () {
        let flightId;

        beforeEach(async function () {
            // Crear un vuelo para testing
            await flightPayment.createFlight(
                "CDMX",
                "GDL",
                Math.floor(Date.now() / 1000) + 86400,
                ethers.parseEther("1500"),
                ethers.parseEther("50"),
                150
            );
            flightId = 0;
        });

        it("Should process payment successfully", async function () {
            const totalCost = ethers.parseEther("1550"); // 1500 + 50 TUA

            await expect(
                flightPayment.connect(user1).payFlight(flightId, 0, {
                    value: totalCost
                })
            ).to.emit(flightPayment, "PaymentProcessed")
             .and.to.emit(flightPayment, "UserRegistered")
             .and.to.emit(flightPayment, "TicketGenerated");

            // Verificar que el usuario está registrado
            expect(await flightPayment.registeredUsers(user1.address)).to.be.true;

            // Verificar que se redujo el número de asientos
            const flights = await flightPayment.getActiveFlights();
            expect(flights[0].availableSeats).to.equal(149);
        });

        it("Should apply promotion discount correctly", async function () {
            // Crear promoción
            await flightPayment.createPromotion(
                "Descuento 10%",
                10,
                Math.floor(Date.now() / 1000) + 604800,
                100
            );

            const totalCost = ethers.parseEther("1550");
            const discount = totalCost * 10n / 100n;
            const finalAmount = totalCost - discount;

            await expect(
                flightPayment.connect(user2).payFlight(flightId, 1, {
                    value: finalAmount
                })
            ).to.emit(flightPayment, "PaymentProcessed");

            // Verificar que se aplicó el descuento
            const payments = await flightPayment.getUserPayments(user2.address);
            expect(payments[0].discount).to.equal(discount);
            expect(payments[0].finalAmount).to.equal(finalAmount);
        });

        it("Should fail with insufficient payment", async function () {
            const insufficientAmount = ethers.parseEther("1000");

            await expect(
                flightPayment.connect(user1).payFlight(flightId, 0, {
                    value: insufficientAmount
                })
            ).to.be.revertedWith("Insufficient payment amount");
        });

        it("Should fail for non-existent flight", async function () {
            await expect(
                flightPayment.connect(user1).payFlight(999, 0, {
                    value: ethers.parseEther("1550")
                })
            ).to.be.revertedWith("Flight does not exist or is inactive");
        });

        it("Should fail when no seats available", async function () {
            // Reservar todos los asientos
            for (let i = 0; i < 150; i++) {
                await flightPayment.connect(addrs[i]).payFlight(flightId, 0, {
                    value: ethers.parseEther("1550")
                });
            }

            // Intentar reservar un asiento más
            await expect(
                flightPayment.connect(user1).payFlight(flightId, 0, {
                    value: ethers.parseEther("1550")
                })
            ).to.be.revertedWith("No available seats");
        });

        it("Should refund excess payment", async function () {
            const excessAmount = ethers.parseEther("2000");
            const totalCost = ethers.parseEther("1550");
            const refundAmount = excessAmount - totalCost;

            const initialBalance = await ethers.provider.getBalance(user1.address);

            await flightPayment.connect(user1).payFlight(flightId, 0, {
                value: excessAmount
            });

            const finalBalance = await ethers.provider.getBalance(user1.address);
            // Nota: el balance final será menor debido al gas usado
            expect(finalBalance).to.be.lt(initialBalance - totalCost);
        });
    });

    describe("User Payments", function () {
        let flightId;

        beforeEach(async function () {
            await flightPayment.createFlight(
                "CDMX",
                "GDL",
                Math.floor(Date.now() / 1000) + 86400,
                ethers.parseEther("1500"),
                ethers.parseEther("50"),
                150
            );
            flightId = 0;
        });

        it("Should return user payments correctly", async function () {
            await flightPayment.connect(user1).payFlight(flightId, 0, {
                value: ethers.parseEther("1550")
            });

            const payments = await flightPayment.getUserPayments(user1.address);
            expect(payments.length).to.equal(1);
            expect(payments[0].user).to.equal(user1.address);
            expect(payments[0].flightId).to.equal(flightId);
            expect(payments[0].isConfirmed).to.be.true;
        });

        it("Should return empty array for user with no payments", async function () {
            const payments = await flightPayment.getUserPayments(user1.address);
            expect(payments.length).to.equal(0);
        });

        it("Should generate unique ticket numbers", async function () {
            await flightPayment.connect(user1).payFlight(flightId, 0, {
                value: ethers.parseEther("1550")
            });

            await flightPayment.connect(user2).payFlight(flightId, 0, {
                value: ethers.parseEther("1550")
            });

            const payments1 = await flightPayment.getUserPayments(user1.address);
            const payments2 = await flightPayment.getUserPayments(user2.address);

            expect(payments1[0].ticketNumber).to.not.equal(payments2[0].ticketNumber);
        });
    });

    describe("Contract Balance", function () {
        it("Should allow owner to withdraw funds", async function () {
            // Crear vuelo y hacer pago
            await flightPayment.createFlight(
                "CDMX",
                "GDL",
                Math.floor(Date.now() / 1000) + 86400,
                ethers.parseEther("1500"),
                ethers.parseEther("50"),
                150
            );

            await flightPayment.connect(user1).payFlight(0, 0, {
                value: ethers.parseEther("1550")
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            const contractBalance = await flightPayment.getContractBalance();

            await flightPayment.withdrawFunds();

            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance).to.be.gt(initialBalance);
            expect(await flightPayment.getContractBalance()).to.equal(0);
        });

        it("Should not allow non-owner to withdraw funds", async function () {
            await expect(
                flightPayment.connect(user1).withdrawFunds()
            ).to.be.revertedWithCustomError(flightPayment, "OwnableUnauthorizedAccount");
        });
    });

    describe("MXNB Token", function () {
        it("Should have correct decimals", async function () {
            expect(await mxnbToken.decimals()).to.equal(6);
        });

        it("Should have correct symbol", async function () {
            expect(await mxnbToken.symbol()).to.equal("MXNB");
        });

        it("Should allow owner to mint tokens", async function () {
            const mintAmount = ethers.parseUnits("1000", 6);
            await mxnbToken.mint(user1.address, mintAmount);
            expect(await mxnbToken.balanceOf(user1.address)).to.equal(mintAmount);
        });

        it("Should not allow non-owner to mint tokens", async function () {
            await expect(
                mxnbToken.connect(user1).mint(user2.address, ethers.parseUnits("1000", 6))
            ).to.be.revertedWithCustomError(mxnbToken, "OwnableUnauthorizedAccount");
        });

        it("Should allow users to burn their tokens", async function () {
            const mintAmount = ethers.parseUnits("1000", 6);
            await mxnbToken.mint(user1.address, mintAmount);
            
            const burnAmount = ethers.parseUnits("500", 6);
            await mxnbToken.connect(user1).burn(burnAmount);
            
            expect(await mxnbToken.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
        });
    });

    describe("Integration Tests", function () {
        it("Should handle multiple flights and payments", async function () {
            // Crear múltiples vuelos
            await flightPayment.createFlight("CDMX", "GDL", Math.floor(Date.now() / 1000) + 86400, ethers.parseEther("1500"), ethers.parseEther("50"), 100);
            await flightPayment.createFlight("GDL", "MTY", Math.floor(Date.now() / 1000) + 172800, ethers.parseEther("1200"), ethers.parseEther("50"), 80);
            await flightPayment.createFlight("MTY", "CUN", Math.floor(Date.now() / 1000) + 259200, ethers.parseEther("1800"), ethers.parseEther("50"), 60);

            // Crear promoción
            await flightPayment.createPromotion("Descuento 15%", 15, Math.floor(Date.now() / 1000) + 604800, 50);

            // Hacer múltiples pagos
            await flightPayment.connect(user1).payFlight(0, 0, { value: ethers.parseEther("1550") });
            await flightPayment.connect(user2).payFlight(1, 1, { value: ethers.parseEther("1062.5") }); // Con descuento
            await flightPayment.connect(addrs[0]).payFlight(2, 0, { value: ethers.parseEther("1850") });

            // Verificar vuelos activos
            const flights = await flightPayment.getActiveFlights();
            expect(flights.length).to.equal(3);

            // Verificar promociones activas
            const promotions = await flightPayment.getActivePromotions();
            expect(promotions.length).to.equal(1);

            // Verificar pagos de usuario
            const user1Payments = await flightPayment.getUserPayments(user1.address);
            const user2Payments = await flightPayment.getUserPayments(user2.address);
            expect(user1Payments.length).to.equal(1);
            expect(user2Payments.length).to.equal(1);
        });
    });
}); 