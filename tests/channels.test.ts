import { describe, it, expect } from "vitest"; // or jest
import { computeChannels } from "../src/computeChannels";
import { BodyScanTelemetry } from "../src/types";

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

describe("Channels – ForeignObjectDensityChannel", () => {
  it("classifies LOW density", () => {
    const t = baseTelemetry({
      scanRegion: "TORSO",
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
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.ForeignObjectDensityChannel).toBe("LOW");
  });

  it("classifies MEDIUM density", () => {
    const t = baseTelemetry({
      scanRegion: "TORSO",
      detectorOutput: {
        foreignObjectCandidates: new Array(5).fill(0).map((_, i) => ({
          id: `FO-${i}`,
          location: { x: 0, y: 0, z: 0 },
          sizeMm: 5,
          densityClass: "MEDIUM",
          shapeDescriptor: "GENERIC"
        })),
        materialClassProbabilities: {
          metal: 0,
          ceramic: 0,
          polymer: 0,
          biological: 1
        },
        implantShapeLikelihood: 0,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels, debug } = computeChannels(t);
    expect(debug.foreignObjectDensity).toBeGreaterThan(0.1);
    expect(debug.foreignObjectDensity).toBeLessThan(1.0);
    expect(channels.ForeignObjectDensityChannel).toBe("MEDIUM");
  });

  it("classifies HIGH density", () => {
    const t = baseTelemetry({
      scanRegion: "HEAD",
      detectorOutput: {
        foreignObjectCandidates: new Array(10).fill(0).map((_, i) => ({
          id: `FO-${i}`,
          location: { x: 0, y: 0, z: 0 },
          sizeMm: 5,
          densityClass: "HIGH",
          shapeDescriptor: "GENERIC"
        })),
        materialClassProbabilities: {
          metal: 0,
          ceramic: 0,
          polymer: 0,
          biological: 1
        },
        implantShapeLikelihood: 0,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.ForeignObjectDensityChannel).toBe("HIGH");
  });
});

describe("Channels – ImplantShapeLikelihoodChannel", () => {
  it("NORMAL for low likelihood", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0,
          ceramic: 0,
          polymer: 0,
          biological: 1
        },
        implantShapeLikelihood: 0.1,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.ImplantShapeLikelihoodChannel).toBe("NORMAL");
  });

  it("SUSPICIOUS for mid likelihood", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0,
          ceramic: 0,
          polymer: 0,
          biological: 1
        },
        implantShapeLikelihood: 0.4,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.ImplantShapeLikelihoodChannel).toBe("SUSPICIOUS");
  });

  it("LIKELY_IMPLANT for high likelihood", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0,
          ceramic: 0,
          polymer: 0,
          biological: 1
        },
        implantShapeLikelihood: 0.8,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.ImplantShapeLikelihoodChannel).toBe("LIKELY_IMPLANT");
  });
});

describe("Channels – MaterialRiskChannel", () => {
  it("LOW risk", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0.05,
          ceramic: 0.05,
          polymer: 0.1,
          biological: 0.8
        },
        implantShapeLikelihood: 0,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.MaterialRiskChannel).toBe("LOW");
  });

  it("MEDIUM risk", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0.3,
          ceramic: 0.1,
          polymer: 0.2,
          biological: 0.4
        },
        implantShapeLikelihood: 0,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.MaterialRiskChannel).toBe("MEDIUM");
  });

  it("HIGH risk", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0.8,
          ceramic: 0.1,
          polymer: 0.05,
          biological: 0.05
        },
        implantShapeLikelihood: 0,
        anomalyDensity: 0,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.MaterialRiskChannel).toBe("HIGH");
  });
});

describe("Channels – Context, Location, Quality, Anomaly, KnownImplant", () => {
  it("ContextualIntentChannel maps MEDICAL+LOW to BENIGN_CONTEXT", () => {
    const t = baseTelemetry();
    const { channels } = computeChannels(t);
    expect(channels.ContextualIntentChannel).toBe("BENIGN_CONTEXT");
  });

  it("ContextualIntentChannel maps SECURITY+HIGH to HOSTILE_CONTEXT", () => {
    const t = baseTelemetry({
      context: {
        scanPurpose: "SECURITY",
        environmentRiskLevel: "HIGH",
        operatorId: "OP-2"
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.ContextualIntentChannel).toBe("HOSTILE_CONTEXT");
  });

  it("LocationCriticalityChannel maps HEAD to CRITICAL", () => {
    const t = baseTelemetry({ scanRegion: "HEAD" });
    const { channels } = computeChannels(t);
    expect(channels.LocationCriticalityChannel).toBe("CRITICAL");
  });

  it("ScanQualityChannel respects calibration ERROR", () => {
    const t = baseTelemetry({
      metadata: {
        deviceModel: "XR-9000",
        deviceCalibrationState: "ERROR",
        softwareVersion: "1.0.0"
      },
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
        signalNoiseRatio: 5,
        scanQualityScore: 0.9
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.ScanQualityChannel).toBe("POOR");
  });

  it("AnomalyDensityChannel HIGH for large anomaly density", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
        materialClassProbabilities: {
          metal: 0,
          ceramic: 0,
          polymer: 0,
          biological: 1
        },
        implantShapeLikelihood: 0,
        anomalyDensity: 0.8,
        signalNoiseRatio: 20,
        scanQualityScore: 0.8
      }
    });
    const { channels } = computeChannels(t);
    expect(channels.AnomalyDensityChannel).toBe("HIGH");
  });

  it("KnownImplantMatchChannel KNOWN_BENIGN for high likelihood in MEDICAL context", () => {
    const t = baseTelemetry({
      detectorOutput: {
        foreignObjectCandidates: [],
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
    const { channels } = computeChannels(t);
    expect(channels.KnownImplantMatchChannel).toBe("KNOWN_BENIGN");
  });
});
