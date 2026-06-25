import {
  BodyScanTelemetry,
  Channels,
  ForeignObjectDensityLevel,
  ImplantShapeLikelihoodLevel,
  MaterialRiskLevel,
  LocationCriticalityLevel,
  ContextualIntentLevel,
  ScanQualityLevel,
  AnomalyDensityLevel,
  KnownImplantMatchLevel
} from "./types";

// Helper: foreign object density (candidates per liter)
// For now, treat region as a coarse proxy for volume.
function estimateVolumeLiters(scanRegion: string): number {
  switch (scanRegion) {
    case "HEAD":
      return 4;
    case "TORSO":
      return 25;
    case "ABDOMEN":
      return 15;
    case "LIMBS":
      return 20;
    case "FULL_BODY":
      return 60;
    default:
      return 20;
  }
}

function computeForeignObjectDensityLevel(
  telemetry: BodyScanTelemetry
): { level: ForeignObjectDensityLevel; density: number } {
  const count = telemetry.detectorOutput.foreignObjectCandidates.length;
  const volume = estimateVolumeLiters(telemetry.scanRegion);
  const density = volume > 0 ? count / volume : 0;

  let level: ForeignObjectDensityLevel;
  if (density < 0.1) level = "LOW";
  else if (density < 1.0) level = "MEDIUM";
  else level = "HIGH";

  return { level, density };
}

function computeImplantShapeLikelihoodLevel(
  likelihood: number
): ImplantShapeLikelihoodLevel {
  if (likelihood < 0.2) return "NORMAL";
  if (likelihood < 0.6) return "SUSPICIOUS";
  return "LIKELY_IMPLANT";
}

function computeMaterialRiskScore(prob: {
  metal: number;
  ceramic: number;
  polymer: number;
  biological: number;
}): { level: MaterialRiskLevel; score: number } {
  const score =
    0.8 * prob.metal +
    0.6 * prob.ceramic +
    0.3 * prob.polymer +
    0.0 * prob.biological;

  let level: MaterialRiskLevel;
  if (score < 0.2) level = "LOW";
  else if (score < 0.5) level = "MEDIUM";
  else level = "HIGH";

  return { level, score };
}

function computeLocationCriticalityLevel(
  scanRegion: string
): LocationCriticalityLevel {
  switch (scanRegion) {
    case "HEAD":
      return "CRITICAL";
    case "TORSO":
    case "ABDOMEN":
      return "ELEVATED";
    case "LIMBS":
    case "FULL_BODY":
    default:
      return "BASELINE";
  }
}

function computeContextualIntentLevel(
  scanPurpose: string,
  environmentRiskLevel: string
): ContextualIntentLevel {
  if (scanPurpose === "MEDICAL" && environmentRiskLevel === "LOW") {
    return "BENIGN_CONTEXT";
  }
  if (environmentRiskLevel === "HIGH" && scanPurpose !== "MEDICAL") {
    return "HOSTILE_CONTEXT";
  }
  return "MIXED_CONTEXT";
}

function computeScanQualityLevel(
  scanQualityScore: number,
  calibrationState: string
): ScanQualityLevel {
  if (calibrationState === "ERROR") return "POOR";
  if (scanQualityScore < 0.3) return "POOR";
  if (scanQualityScore < 0.6) return "FAIR";
  if (scanQualityScore < 0.85) return "GOOD";
  return "EXCELLENT";
}

function computeAnomalyDensityLevel(
  anomalyDensity: number
): AnomalyDensityLevel {
  if (anomalyDensity < 0.1) return "LOW";
  if (anomalyDensity < 0.5) return "MEDIUM";
  return "HIGH";
}

// Placeholder: in a real system this would query a library of known implants.
function computeKnownImplantMatchLevel(
  telemetry: BodyScanTelemetry
): KnownImplantMatchLevel {
  // For now: if shape likelihood is high and context is MEDICAL, assume known benign.
  const likelihood = telemetry.detectorOutput.implantShapeLikelihood;
  if (
    likelihood > 0.7 &&
    telemetry.context.scanPurpose === "MEDICAL"
  ) {
    return "KNOWN_BENIGN";
  }
  if (likelihood > 0.7) {
    return "UNKNOWN_PATTERN";
  }
  return "NONE";
}

export function computeChannels(telemetry: BodyScanTelemetry): {
  channels: Channels;
  debug: {
    foreignObjectDensity: number;
    materialRiskScore: number;
  };
} {
  const { level: fodLevel, density } = computeForeignObjectDensityLevel(
    telemetry
  );
  const shapeLevel = computeImplantShapeLikelihoodLevel(
    telemetry.detectorOutput.implantShapeLikelihood
  );
  const { level: materialLevel, score: materialScore } =
    computeMaterialRiskScore(telemetry.detectorOutput.materialClassProbabilities);
  const locLevel = computeLocationCriticalityLevel(telemetry.scanRegion);
  const ctxLevel = computeContextualIntentLevel(
    telemetry.context.scanPurpose,
    telemetry.context.environmentRiskLevel
  );
  const qualityLevel = computeScanQualityLevel(
    telemetry.detectorOutput.scanQualityScore,
    telemetry.metadata.deviceCalibrationState
  );
  const anomalyLevel = computeAnomalyDensityLevel(
    telemetry.detectorOutput.anomalyDensity
  );
  const knownImplantLevel = computeKnownImplantMatchLevel(telemetry);

  const channels: Channels = {
    ForeignObjectDensityChannel: fodLevel,
    ImplantShapeLikelihoodChannel: shapeLevel,
    MaterialRiskChannel: materialLevel,
    LocationCriticalityChannel: locLevel,
    ContextualIntentChannel: ctxLevel,
    ScanQualityChannel: qualityLevel,
    AnomalyDensityChannel: anomalyLevel,
    KnownImplantMatchChannel: knownImplantLevel
  };

  return {
    channels,
    debug: {
      foreignObjectDensity: density,
      materialRiskScore: materialScore
    }
  };
}
