import { describe, it, expect } from "vitest"; // or jest
import { BodyScanTelemetry } from "../src/types";
import { computeVerdict } from "../src/computeVerdict";

function baseTelemetry(overrides: Partial<BodyScanTelemetry> = {}): BodyScanTelemetry {
  return {
    scanId: "TEST",
    subjectId: "SUBJ",
    scanModality: "XRAY",
    scanRegion: "TORSO",
    timestamp: "2026-06-24T20:00:00Z",
    detectorOutput: {
      foreignObjectCandidates: [],
      materialClassProbabilities: {
        metal: 0,
        ceramic: 0,
        polymer: 0,
        biological: 1
      },
      implantShapeLikelihood: 0,
      anomalyDensity: 0,
      signalNoiseRatio: 20,
      scanQualityScore: 0.8,
      ...(overrides.detectorOutput || {})
    },
    context: {
      scanPurpose: "MEDICAL",
      environmentRiskLevel: "LOW",
      operatorId: "OP-1",
      ...(overrides.context || {})
    },
    metadata: {
      deviceModel: "XR-9000",
      deviceCalibrationState: "OK",
      softwareVersion: "1.0.0",
      ...(overrides.metadata || {})
    },
    ...(overrides as any)
  };
}

describe("Rules – NoImplantDetected path", () => {
  it("fires when all signals are low", () => {
    const t = baseTelemetry();
    const out = computeVerdict(t);
    expect(out.verdict).toBe("NoImplantDetected");
    expect(out.explanation[0]).toMatch(/Low shape likelihood/);
  });
});

describe("Rules – BenignImplantDetected path", () => {
  it("fires for known benign implant in benign context", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [
          {
            id: "FO-1",
            location: { x: 0, y: 0, z: 0 },
            sizeMm: 40,
            densityClass: "HIGH",
            shapeDescriptor: "PACEMAKER_SHAPE"
          }
        ],
        materialClassProbabilities: {
          metal: 0.7,
          ceramic: 0.1,
          polymer: 0.1,
          biological: 0.1
        },
        implantShapeLikelihood: 0.8,
        anomalyDensity: 0.1,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const out = computeVerdict(t);
    expect(out.verdict).toBe("BenignImplantDetected");
    expect(out.explanation.join(" ")).toMatch(/known benign implant/i);
  });
});

describe("Rules – SuspiciousImplantDetected path", () => {
  it("fires for suspicious shape and medium material risk", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [
          {
            id: "FO-1",
            location: { x: 0, y: 0, z: 0 },
            sizeMm: 10,
            densityClass: "MEDIUM",
            shapeDescriptor: "IRREGULAR"
          }
        ],
        materialClassProbabilities: {
          metal: 0.3,
          ceramic: 0.1,
          polymer: 0.3,
          biological: 0.3
        },
        implantShapeLikelihood: 0.45,
        anomalyDensity: 0.3,
        signalNoiseRatio: 20,
        scanQualityScore: 0.7
      },
      context: {
        scanPurpose: "SECURITY",
        environmentRiskLevel: "MEDIUM",
        operatorId: "OP-2"
      }
    });
    const out = computeVerdict(t);
    expect(out.verdict).toBe("SuspiciousImplantDetected");
    expect(out.explanation.join(" ")).toMatch(/Non-normal shape likelihood/i);
  });
});

describe("Rules – HighRiskImplantDetected path", () => {
  it("fires for high likelihood, high material risk, critical location, hostile context", () => {
    const t = baseTelemetry({
      scanRegion: "HEAD",
      detectorOutput: {
        foreignObjectCandidates: [
          {
            id: "FO-1",
            location: { x: 0, y: 0, z: 0 },
            sizeMm: 8,
            densityClass: "HIGH",
            shapeDescriptor: "PELLET_SHAPE"
          }
        ],
        materialClassProbabilities: {
          metal: 0.9,
          ceramic: 0.05,
          polymer: 0.03,
          biological: 0.02
        },
        implantShapeLikelihood: 0.9,
        anomalyDensity: 0.6,
        signalNoiseRatio: 18,
        scanQualityScore: 0.75
      },
      context: {
        scanPurpose: "SECURITY",
        environmentRiskLevel: "HIGH",
        operatorId: "OP-3"
      }
    });
    const out = computeVerdict(t);
    expect(out.verdict).toBe("HighRiskImplantDetected");
    expect(out.explanation.join(" ")).toMatch(/High implant likelihood, high material risk/i);
  });
});

describe("Rules – Scan quality reduces confidence", () => {
  it("reduces confidence when ScanQualityChannel is POOR", () => {
    const t = baseTelemetry({
      metadata: {
        deviceModel: "XR-9000",
        deviceCalibrationState: "ERROR",
        softwareVersion: "1.0.0"
      },
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0.4,
          ceramic: 0.1,
          polymer: 0.2,
          biological: 0.3
        },
        implantShapeLikelihood: 0.5,
        anomalyDensity: 0.3,
        signalNoiseRatio: 5,
        scanQualityScore: 0.2
      }
    });
    const out = computeVerdict(t);
    expect(out.confidence).toBeLessThan(0.6); // rough bound; main check is that it’s low
    expect(out.explanation.join(" ")).toMatch(/Scan quality is poor/i);
  });
});
