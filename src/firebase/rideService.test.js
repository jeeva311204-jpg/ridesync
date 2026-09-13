import { describe, it, expect } from "vitest";
import { calculateFare, getFareEstimates, haversineKm } from "./rideService";

describe("calculateFare", () => {
  it("returns just the base fare when distance is 0 or missing", () => {
    expect(calculateFare(0, "car")).toBe(40);
    expect(calculateFare(null, "car")).toBe(40);
    expect(calculateFare(undefined, "bike")).toBe(20);
  });

  it("calculates car fare correctly for a given distance", () => {
    // 5km at car rate: base 40 + (5 * 12) = 100
    expect(calculateFare(5000, "car")).toBe(100);
  });

  it("calculates bike fare correctly for a given distance", () => {
    // 5km at bike rate: base 20 + (5 * 8) = 60
    expect(calculateFare(5000, "bike")).toBe(60);
  });

  it("calculates auto fare correctly for a given distance", () => {
    // 5km at auto rate: base 30 + (5 * 10) = 80
    expect(calculateFare(5000, "auto")).toBe(80);
  });

  it("defaults to car pricing for an unknown vehicle type", () => {
    expect(calculateFare(5000, "spaceship")).toBe(calculateFare(5000, "car"));
  });

  it("rounds the fare to the nearest whole number", () => {
    // 3.3km at car rate: 40 + (3.3 * 12) = 79.6 -> should round to 80
    expect(calculateFare(3300, "car")).toBe(80);
  });
});

describe("getFareEstimates", () => {
  it("returns fare estimates for all three vehicle types", () => {
    const estimates = getFareEstimates(5000);
    expect(estimates).toHaveProperty("bike");
    expect(estimates).toHaveProperty("auto");
    expect(estimates).toHaveProperty("car");
  });

  it("bike is always cheaper than car for the same distance", () => {
    const estimates = getFareEstimates(10000);
    expect(estimates.bike).toBeLessThan(estimates.car);
  });

  it("auto is priced between bike and car", () => {
    const estimates = getFareEstimates(10000);
    expect(estimates.auto).toBeGreaterThan(estimates.bike);
    expect(estimates.auto).toBeLessThan(estimates.car);
  });
});

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    const point = { lat: 11.1085, lng: 77.3411 };
    expect(haversineKm(point, point)).toBe(0);
  });

  it("returns 0 if either point is missing", () => {
    expect(haversineKm(null, { lat: 1, lng: 1 })).toBe(0);
    expect(haversineKm({ lat: 1, lng: 1 }, null)).toBe(0);
  });

  it("calculates a reasonable distance between two known points", () => {
    // Tiruppur to Coimbatore is roughly 45-50km apart
    const tiruppur = { lat: 11.1085, lng: 77.3411 };
    const coimbatore = { lat: 11.0168, lng: 76.9558 };
    const distance = haversineKm(tiruppur, coimbatore);
    expect(distance).toBeGreaterThan(30);
    expect(distance).toBeLessThan(60);
  });
});
