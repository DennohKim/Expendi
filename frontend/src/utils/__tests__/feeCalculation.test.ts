import { calculateB2CFee, calculateAmountWithFee, calculateUSDCAmountWithFee } from '../feeCalculation';

describe('Fee Calculation', () => {
  describe('calculateB2CFee', () => {
    it('should return correct fee for amount 0-100', () => {
      expect(calculateB2CFee(0)).toBe(1);
      expect(calculateB2CFee(50)).toBe(1);
      expect(calculateB2CFee(100)).toBe(1);
    });

    it('should return correct fee for amount 101-500', () => {
      expect(calculateB2CFee(101)).toBe(8);
      expect(calculateB2CFee(250)).toBe(8);
      expect(calculateB2CFee(500)).toBe(8);
    });

    it('should return correct fee for amount 501-1000', () => {
      expect(calculateB2CFee(501)).toBe(12);
      expect(calculateB2CFee(750)).toBe(12);
      expect(calculateB2CFee(1000)).toBe(12);
    });

    it('should return correct fee for amount 1001-1500', () => {
      expect(calculateB2CFee(1001)).toBe(20);
      expect(calculateB2CFee(1250)).toBe(20);
      expect(calculateB2CFee(1500)).toBe(20);
    });

    it('should return correct fee for amount 1501-2500', () => {
      expect(calculateB2CFee(1501)).toBe(22);
      expect(calculateB2CFee(2000)).toBe(22);
      expect(calculateB2CFee(2500)).toBe(22);
    });

    it('should return correct fee for amount 2501-3500', () => {
      expect(calculateB2CFee(2501)).toBe(25);
      expect(calculateB2CFee(3000)).toBe(25);
      expect(calculateB2CFee(3500)).toBe(25);
    });

    it('should return correct fee for amount 3501-5000', () => {
      expect(calculateB2CFee(3501)).toBe(27);
      expect(calculateB2CFee(4250)).toBe(27);
      expect(calculateB2CFee(5000)).toBe(27);
    });

    it('should return correct fee for amount 5001-7500', () => {
      expect(calculateB2CFee(5001)).toBe(30);
      expect(calculateB2CFee(6250)).toBe(30);
      expect(calculateB2CFee(7500)).toBe(30);
    });

    it('should return correct fee for amount 7501-10000', () => {
      expect(calculateB2CFee(7501)).toBe(35);
      expect(calculateB2CFee(8750)).toBe(35);
      expect(calculateB2CFee(10000)).toBe(35);
    });

    it('should return correct fee for amount 10001-15000', () => {
      expect(calculateB2CFee(10001)).toBe(37);
      expect(calculateB2CFee(12500)).toBe(37);
      expect(calculateB2CFee(15000)).toBe(37);
    });

    it('should return correct fee for amount 15001-20000', () => {
      expect(calculateB2CFee(15001)).toBe(40);
      expect(calculateB2CFee(17500)).toBe(40);
      expect(calculateB2CFee(20000)).toBe(40);
    });

    it('should return correct fee for amount 20001-25000', () => {
      expect(calculateB2CFee(20001)).toBe(43);
      expect(calculateB2CFee(22500)).toBe(43);
      expect(calculateB2CFee(25000)).toBe(43);
    });

    it('should return correct fee for amount 25001-30000', () => {
      expect(calculateB2CFee(25001)).toBe(45);
      expect(calculateB2CFee(27500)).toBe(45);
      expect(calculateB2CFee(30000)).toBe(45);
    });

    it('should return correct fee for amount 30001-35000', () => {
      expect(calculateB2CFee(30001)).toBe(50);
      expect(calculateB2CFee(32500)).toBe(50);
      expect(calculateB2CFee(35000)).toBe(50);
    });

    it('should return correct fee for amount 35001-40000', () => {
      expect(calculateB2CFee(35001)).toBe(60);
      expect(calculateB2CFee(37500)).toBe(60);
      expect(calculateB2CFee(40000)).toBe(60);
    });

    it('should return correct fee for amount 40001-45000', () => {
      expect(calculateB2CFee(40001)).toBe(70);
      expect(calculateB2CFee(42500)).toBe(70);
      expect(calculateB2CFee(45000)).toBe(70);
    });

    it('should return correct fee for amount 45001-50000', () => {
      expect(calculateB2CFee(45001)).toBe(80);
      expect(calculateB2CFee(47500)).toBe(80);
      expect(calculateB2CFee(50000)).toBe(80);
    });

    it('should return correct fee for amount 50001-70000', () => {
      expect(calculateB2CFee(50001)).toBe(100);
      expect(calculateB2CFee(60000)).toBe(100);
      expect(calculateB2CFee(70000)).toBe(100);
    });

    it('should return correct fee for amount 70001-250000', () => {
      expect(calculateB2CFee(70001)).toBe(150);
      expect(calculateB2CFee(100000)).toBe(150);
      expect(calculateB2CFee(250000)).toBe(150);
    });

    it('should return default fee for amounts above 250000', () => {
      expect(calculateB2CFee(250001)).toBe(150);
      expect(calculateB2CFee(500000)).toBe(150);
    });
  });

  describe('calculateAmountWithFee', () => {
    it('should calculate total amount with fee correctly', () => {
      const result = calculateAmountWithFee(1000);
      expect(result.baseAmount).toBe(1000);
      expect(result.fee).toBe(12);
      expect(result.total).toBe(1012);
      expect(result.hasFee).toBe(true);
    });

    it('should handle zero amount', () => {
      const result = calculateAmountWithFee(0);
      expect(result.baseAmount).toBe(0);
      expect(result.fee).toBe(1);
      expect(result.total).toBe(1);
      expect(result.hasFee).toBe(true);
    });
  });

  describe('calculateUSDCAmountWithFee', () => {
    it('should calculate USDC amounts with fee correctly', () => {
      const exchangeRate = 100; // 1 USDC = 100 KES
      const localAmount = 1000; // 1000 KES
      
      const result = calculateUSDCAmountWithFee(localAmount, exchangeRate);
      
      expect(result.baseAmountLocal).toBe(1000);
      expect(result.feeLocal).toBe(12);
      expect(result.totalLocal).toBe(1012);
      expect(result.baseAmountUSDC).toBe(10); // 1000 / 100
      expect(result.feeUSDC).toBe(0.12); // 12 / 100
      expect(result.totalUSDC).toBe(10.12); // 1012 / 100
      expect(result.hasFee).toBe(true);
    });

    it('should handle zero exchange rate', () => {
      const result = calculateUSDCAmountWithFee(1000, 0);
      expect(result.baseAmountUSDC).toBe(Infinity);
      expect(result.feeUSDC).toBe(Infinity);
      expect(result.totalUSDC).toBe(Infinity);
    });
  });
});
