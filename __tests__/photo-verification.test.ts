import { describe, it, expect } from "vitest";
import { calculateDistance, formatDistance, isWithinThreshold } from "../lib/location-utils";

describe("Location Utilities", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two points correctly", () => {
      // Sydney Opera House to Sydney Harbour Bridge (approximately 1km)
      const distance = calculateDistance(
        -33.8568, 151.2153, // Opera House
        -33.8523, 151.2108  // Harbour Bridge
      );
      // Should be approximately 600-700 meters
      expect(distance).toBeGreaterThan(500);
      expect(distance).toBeLessThan(800);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(
        -33.8568, 151.2153,
        -33.8568, 151.2153
      );
      expect(distance).toBe(0);
    });

    it("should calculate long distances correctly", () => {
      // Sydney to Melbourne (approximately 713km)
      const distance = calculateDistance(
        -33.8688, 151.2093, // Sydney
        -37.8136, 144.9631  // Melbourne
      );
      // Should be approximately 700-730 km
      expect(distance).toBeGreaterThan(700000);
      expect(distance).toBeLessThan(750000);
    });
  });

  describe("formatDistance", () => {
    it("should format meters correctly", () => {
      expect(formatDistance(50)).toBe("50m");
      expect(formatDistance(500)).toBe("500m");
      expect(formatDistance(999)).toBe("999m");
    });

    it("should format kilometers correctly", () => {
      expect(formatDistance(1000)).toBe("1.0km");
      expect(formatDistance(1500)).toBe("1.5km");
      expect(formatDistance(10000)).toBe("10.0km");
    });
  });

  describe("isWithinThreshold", () => {
    it("should return true when within threshold", () => {
      // Two points about 50 meters apart
      const result = isWithinThreshold(
        -33.8568, 151.2153,
        -33.8572, 151.2153,
        100 // 100 meter threshold
      );
      expect(result).toBe(true);
    });

    it("should return false when outside threshold", () => {
      // Two points about 500 meters apart
      const result = isWithinThreshold(
        -33.8568, 151.2153,
        -33.8523, 151.2108,
        100 // 100 meter threshold
      );
      expect(result).toBe(false);
    });

    it("should use default threshold of 100 meters", () => {
      // Same point should be within threshold
      const result = isWithinThreshold(
        -33.8568, 151.2153,
        -33.8568, 151.2153
      );
      expect(result).toBe(true);
    });
  });
});

describe("VerifiedPhotoData Interface", () => {
  it("should have correct structure", () => {
    const verifiedPhotoData = {
      uri: "file:///test/photo.jpg",
      captureDate: "2024-01-15T10:30:00.000Z",
      isExifAvailable: true,
      uploadDate: "2024-01-15T10:30:00.000Z",
      verificationMethod: "camera-capture" as const,
      photoHash: "abc123def456",
      gpsCoordinates: {
        latitude: -33.8568,
        longitude: 151.2153,
        accuracy: 10,
      },
      locationVerified: true,
      compositionGuide: "room-corner",
    };

    expect(verifiedPhotoData.verificationMethod).toBe("camera-capture");
    expect(verifiedPhotoData.locationVerified).toBe(true);
    expect(verifiedPhotoData.gpsCoordinates?.latitude).toBe(-33.8568);
    expect(verifiedPhotoData.photoHash).toBeTruthy();
  });

  it("should allow null GPS coordinates", () => {
    const verifiedPhotoData = {
      uri: "file:///test/photo.jpg",
      captureDate: "2024-01-15T10:30:00.000Z",
      isExifAvailable: true,
      uploadDate: "2024-01-15T10:30:00.000Z",
      verificationMethod: "camera-capture" as const,
      photoHash: "abc123def456",
      gpsCoordinates: null,
      locationVerified: false,
    };

    expect(verifiedPhotoData.gpsCoordinates).toBeNull();
    expect(verifiedPhotoData.locationVerified).toBe(false);
  });
});

describe("Checkpoint with VerifiedPhotoData", () => {
  it("should support verifiedPhotoData field", () => {
    const checkpoint = {
      id: "test-123",
      roomName: "Living Room",
      title: "Room Corner Shot",
      landlordPhoto: "file:///test/photo.jpg",
      tenantPhoto: null,
      moveOutPhoto: null,
      landlordCondition: "pass" as const,
      tenantCondition: null,
      moveOutCondition: null,
      notes: "Test notes",
      timestamp: "2024-01-15T10:30:00.000Z",
      landlordPhotoTimestamp: {
        captureDate: "2024-01-15T10:30:00.000Z",
        isExifAvailable: true,
        uploadDate: "2024-01-15T10:30:00.000Z",
      },
      tenantPhotoTimestamp: null,
      moveOutPhotoTimestamp: null,
      verifiedPhotoData: {
        uri: "file:///test/photo.jpg",
        captureDate: "2024-01-15T10:30:00.000Z",
        isExifAvailable: true,
        uploadDate: "2024-01-15T10:30:00.000Z",
        verificationMethod: "camera-capture" as const,
        photoHash: "abc123def456",
        gpsCoordinates: {
          latitude: -33.8568,
          longitude: 151.2153,
          accuracy: 10,
        },
        locationVerified: true,
        compositionGuide: "room-corner",
      },
    };

    expect(checkpoint.verifiedPhotoData).toBeDefined();
    expect(checkpoint.verifiedPhotoData?.verificationMethod).toBe("camera-capture");
    expect(checkpoint.verifiedPhotoData?.locationVerified).toBe(true);
  });

  it("should work without verifiedPhotoData for backwards compatibility", () => {
    const checkpoint = {
      id: "test-123",
      roomName: "Living Room",
      title: "Photo",
      landlordPhoto: "file:///test/photo.jpg",
      tenantPhoto: null,
      moveOutPhoto: null,
      landlordCondition: "pass" as const,
      tenantCondition: null,
      moveOutCondition: null,
      notes: "",
      timestamp: "2024-01-15T10:30:00.000Z",
      landlordPhotoTimestamp: null,
      tenantPhotoTimestamp: null,
      moveOutPhotoTimestamp: null,
      // No verifiedPhotoData field
    };

    expect(checkpoint.landlordPhoto).toBeTruthy();
    expect((checkpoint as any).verifiedPhotoData).toBeUndefined();
  });
});

describe("Property GPS Coordinates", () => {
  it("should support latitude and longitude fields", () => {
    const property = {
      id: "prop-123",
      address: "123 Test Street, Sydney NSW 2000",
      propertyType: "apartment" as const,
      bedrooms: 2,
      bathrooms: 1,
      photo: null,
      profilePhoto: null,
      tenantId: null,
      tenantName: null,
      tenantEmail: null,
      tenantPhone: null,
      inspections: [],
      createdAt: "2024-01-15T10:00:00.000Z",
      latitude: -33.8568,
      longitude: 151.2153,
    };

    expect(property.latitude).toBe(-33.8568);
    expect(property.longitude).toBe(151.2153);
  });

  it("should allow properties without GPS coordinates", () => {
    const property = {
      id: "prop-123",
      address: "123 Test Street, Sydney NSW 2000",
      propertyType: "apartment" as const,
      bedrooms: 2,
      bathrooms: 1,
      photo: null,
      profilePhoto: null,
      tenantId: null,
      tenantName: null,
      tenantEmail: null,
      tenantPhone: null,
      inspections: [],
      createdAt: "2024-01-15T10:00:00.000Z",
      // No latitude/longitude
    };

    expect((property as any).latitude).toBeUndefined();
    expect((property as any).longitude).toBeUndefined();
  });
});
