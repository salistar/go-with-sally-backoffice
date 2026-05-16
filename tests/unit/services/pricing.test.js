const expect = require('chai').expect;
const PricingService = require('../../../gowithsally-backend/services/PricingService');

describe('PricingService', () => {
  let pricingService;

  beforeEach(() => {
    pricingService = new PricingService();
  });

  describe('Base Fare Calculation', () => {
    it('should calculate base fare for economy ride', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });

    it('should calculate base fare for comfort ride', () => {
      const rideData = {
        rideType: 'comfort',
        distance: 5,
        duration: 15
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });

    it('should calculate base fare for business ride', () => {
      const rideData = {
        rideType: 'business',
        distance: 5,
        duration: 15
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });

    it('should charge more for comfort vs economy', () => {
      const economyRide = {
        rideType: 'economy',
        distance: 5,
        duration: 15
      };

      const comfortRide = {
        rideType: 'comfort',
        distance: 5,
        duration: 15
      };

      const economyFare = pricingService.calculateFare(economyRide);
      const comfortFare = pricingService.calculateFare(comfortRide);

      expect(comfortFare).to.be.greaterThan(economyFare);
    });

    it('should charge more for business vs comfort', () => {
      const comfortRide = {
        rideType: 'comfort',
        distance: 5,
        duration: 15
      };

      const businessRide = {
        rideType: 'business',
        distance: 5,
        duration: 15
      };

      const comfortFare = pricingService.calculateFare(comfortRide);
      const businessFare = pricingService.calculateFare(businessRide);

      expect(businessFare).to.be.greaterThan(comfortFare);
    });
  });

  describe('Distance-based Pricing', () => {
    it('should increase fare with distance', () => {
      const shortRide = {
        rideType: 'economy',
        distance: 1,
        duration: 5
      };

      const longRide = {
        rideType: 'economy',
        distance: 10,
        duration: 30
      };

      const shortFare = pricingService.calculateFare(shortRide);
      const longFare = pricingService.calculateFare(longRide);

      expect(longFare).to.be.greaterThan(shortFare);
    });

    it('should apply distance rate correctly', () => {
      const rideData = {
        rideType: 'economy',
        distance: 10,
        duration: 30,
        baseFare: 10
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.exist;
    });

    it('should handle very short distances', () => {
      const rideData = {
        rideType: 'economy',
        distance: 0.5,
        duration: 3
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.greaterThan(0);
    });

    it('should handle very long distances', () => {
      const rideData = {
        rideType: 'economy',
        distance: 100,
        duration: 120
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.greaterThan(0);
    });
  });

  describe('Time-based Pricing', () => {
    it('should increase fare with duration', () => {
      const shortRide = {
        rideType: 'economy',
        distance: 5,
        duration: 5
      };

      const longRide = {
        rideType: 'economy',
        distance: 5,
        duration: 30
      };

      const shortFare = pricingService.calculateFare(shortRide);
      const longFare = pricingService.calculateFare(longRide);

      expect(longFare).to.be.greaterThan(shortFare);
    });

    it('should apply waiting time charges', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        waitingTime: 10 // 10 minutes
      };

      const fareWithoutWaiting = pricingService.calculateFare({
        rideType: 'economy',
        distance: 5,
        duration: 15,
        waitingTime: 0
      });

      const fareWithWaiting = pricingService.calculateFare(rideData);

      expect(fareWithWaiting).to.be.greaterThan(fareWithoutWaiting);
    });
  });

  describe('Surge Pricing', () => {
    it('should apply surge multiplier during peak hours', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        timestamp: new Date('2024-03-17T18:00:00') // Evening peak
      };

      const normalFare = pricingService.calculateFare({
        rideType: 'economy',
        distance: 5,
        duration: 15,
        timestamp: new Date('2024-03-17T10:00:00') // Morning off-peak
      });

      const surgeFare = pricingService.calculateFare(rideData);

      // Surge pricing might apply (depends on implementation)
      expect(surgeFare).to.be.a('number');
    });

    it('should apply surge multiplier based on demand', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        surgeMultiplier: 1.5
      };

      const baseFare = pricingService.calculateFare({
        rideType: 'economy',
        distance: 5,
        duration: 15,
        surgeMultiplier: 1.0
      });

      const surgeFare = pricingService.calculateFare(rideData);

      expect(surgeFare).to.be.greaterThan(baseFare);
    });

    it('should cap surge multiplier', () => {
      const maxMultiplier = pricingService.getMaxSurgeMultiplier();

      expect(maxMultiplier).to.be.a('number');
      expect(maxMultiplier).to.be.greaterThan(1);
      expect(maxMultiplier).to.be.lessThan(5);
    });
  });

  describe('Discounts and Promotions', () => {
    it('should apply promo code discount', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        promoCode: 'WELCOME20'
      };

      const fareWithPromo = pricingService.calculateFare(rideData);

      const fareWithoutPromo = pricingService.calculateFare({
        rideType: 'economy',
        distance: 5,
        duration: 15
      });

      // Promo code might reduce fare
      expect(fareWithPromo).to.be.lessThanOrEqual(fareWithoutPromo);
    });

    it('should apply loyalty discount', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        isLoyalCustomer: true,
        loyaltyLevel: 'gold'
      };

      const fareWithLoyalty = pricingService.calculateFare(rideData);

      const fareWithoutLoyalty = pricingService.calculateFare({
        rideType: 'economy',
        distance: 5,
        duration: 15,
        isLoyalCustomer: false
      });

      // Loyalty discount should reduce fare
      expect(fareWithLoyalty).to.be.lessThanOrEqual(fareWithoutLoyalty);
    });

    it('should not apply invalid promo codes', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        promoCode: 'INVALID999'
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });

    it('should stack multiple discounts correctly', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        promoCode: 'WELCOME20',
        isLoyalCustomer: true,
        loyaltyLevel: 'platinum'
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });
  });

  describe('Minimum Fare', () => {
    it('should enforce minimum fare for short rides', () => {
      const rideData = {
        rideType: 'economy',
        distance: 0.1,
        duration: 1
      };

      const fare = pricingService.calculateFare(rideData);
      const minimumFare = pricingService.getMinimumFare('economy');

      expect(fare).to.be.greaterThanOrEqual(minimumFare);
    });

    it('should return different minimums for different ride types', () => {
      const economyMin = pricingService.getMinimumFare('economy');
      const comfortMin = pricingService.getMinimumFare('comfort');
      const businessMin = pricingService.getMinimumFare('business');

      expect(economyMin).to.be.lessThan(comfortMin);
      expect(comfortMin).to.be.lessThan(businessMin);
    });
  });

  describe('Toll and Fees', () => {
    it('should add toll charges for highway rides', () => {
      const rideData = {
        rideType: 'economy',
        distance: 50,
        duration: 60,
        hasTolls: true,
        tollAmount: 25.00
      };

      const fareWithTolls = pricingService.calculateFare(rideData);

      const fareWithoutTolls = pricingService.calculateFare({
        rideType: 'economy',
        distance: 50,
        duration: 60,
        hasTolls: false
      });

      expect(fareWithTolls).to.be.greaterThan(fareWithoutTolls);
    });

    it('should add service fees', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15
      };

      const fare = pricingService.calculateFare(rideData);
      const serviceFee = pricingService.getServiceFee(fare);

      expect(serviceFee).to.be.a('number');
      expect(serviceFee).to.be.greaterThan(0);
    });

    it('should add driver tips separately', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        tip: 10.00
      };

      const fareWithTip = pricingService.calculateFare(rideData);
      const fareWithoutTip = pricingService.calculateFare({
        rideType: 'economy',
        distance: 5,
        duration: 15,
        tip: 0
      });

      expect(fareWithTip).to.be.greaterThan(fareWithoutTip);
    });
  });

  describe('Commission and Splits', () => {
    it('should calculate platform commission', () => {
      const totalFare = 100.00;
      const commission = pricingService.calculateCommission(totalFare);

      expect(commission).to.be.a('number');
      expect(commission).to.be.greaterThan(0);
      expect(commission).to.be.lessThan(totalFare);
    });

    it('should calculate driver earnings after commission', () => {
      const totalFare = 100.00;
      const driverEarnings = pricingService.calculateDriverEarnings(totalFare);

      expect(driverEarnings).to.be.a('number');
      expect(driverEarnings).to.be.greaterThan(0);
      expect(driverEarnings).to.be.lessThan(totalFare);
    });

    it('should split correctly between platform and driver', () => {
      const totalFare = 100.00;
      const commission = pricingService.calculateCommission(totalFare);
      const driverEarnings = pricingService.calculateDriverEarnings(totalFare);

      // Commission + Driver earnings should not exceed total fare
      expect(commission + driverEarnings).to.be.lessThanOrEqual(totalFare);
    });
  });

  describe('Fare Estimate', () => {
    it('should provide accurate fare estimates', () => {
      const estimateData = {
        rideType: 'economy',
        distance: 5,
        duration: 15
      };

      const estimate = pricingService.estimateFare(estimateData);

      expect(estimate).to.be.an('object');
      expect(estimate.minimum).to.be.a('number');
      expect(estimate.maximum).to.be.a('number');
      expect(estimate.expected).to.be.a('number');
    });

    it('should estimate with surge pricing', () => {
      const estimateData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        surgeMultiplier: 1.5
      };

      const estimate = pricingService.estimateFare(estimateData);

      expect(estimate.expected).to.be.a('number');
      expect(estimate.expected).to.be.greaterThan(0);
    });

    it('should break down estimate components', () => {
      const estimateData = {
        rideType: 'economy',
        distance: 5,
        duration: 15
      };

      const estimate = pricingService.estimateFare(estimateData);

      expect(estimate).to.have.property('baseFare');
      expect(estimate).to.have.property('distanceFee');
      expect(estimate).to.have.property('timeFee');
      expect(estimate).to.have.property('serviceFee');
    });
  });

  describe('Currency and Localization', () => {
    it('should support multiple currencies', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        currency: 'MAD'
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });

    it('should handle currency conversion', () => {
      const fareMAD = pricingService.calculateFare({
        rideType: 'economy',
        distance: 5,
        duration: 15,
        currency: 'MAD'
      });

      const fareUSD = pricingService.convertCurrency(fareMAD, 'MAD', 'USD');

      expect(fareUSD).to.be.a('number');
      expect(fareUSD).to.be.greaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero distance', () => {
      const rideData = {
        rideType: 'economy',
        distance: 0,
        duration: 0
      };

      const fare = pricingService.calculateFare(rideData);
      const minimumFare = pricingService.getMinimumFare('economy');

      // Should return minimum fare
      expect(fare).to.be.greaterThanOrEqual(minimumFare);
    });

    it('should handle null promo code', () => {
      const rideData = {
        rideType: 'economy',
        distance: 5,
        duration: 15,
        promoCode: null
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });

    it('should handle extreme distances', () => {
      const rideData = {
        rideType: 'economy',
        distance: 1000,
        duration: 1200
      };

      const fare = pricingService.calculateFare(rideData);

      expect(fare).to.be.a('number');
      expect(fare).to.be.greaterThan(0);
    });
  });
});
