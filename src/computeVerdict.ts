import {
  BodyScanTelemetry,
  ImplantDetectionEngineOutput,
  Verdict
} from "./types";
import { computeChannels } from "./computeChannels";

function baseConfidenceFromChannels(output: {
  shapeLikelihood: number;
  materialRiskScore: number;
  foreignObjectDensity: number;
  anomalyDensity: number;
  scanQualityScore: number;
}): number {
  // Simple weighted average; tune later.
  const {
    shapeLikelihood,
    materialRiskScore,
    foreignObjectDensity,
    anomalyDensity,
    scanQualityScore
  } = output;

  const normFod = Math.min(foreignObjectDensity, 2) / 2;
  const normAnom = Math.min(anomalyDensity, 2) / 2;

  const raw =
    0.3 * shapeLikelihood +
    0.25 * materialRiskScore +
    0.15 * normFod +
    0.15 * normAnom +
    0.15 * scanQualityScore;

  return Math.max(0, Math.min(1, raw));
}

export function computeVerdict(
  telemetry: BodyScanTelemetry
): ImplantDetectionEngineOutput {
  const { channels, debug: channelDebug } = computeChannels(telemetry);

  const explanation: string[] = [];

  const shapeLikelihood = telemetry.detectorOutput.implantShapeLikelihood;
  const materialRiskScore = channelDebug.materialRiskScore;
  const foreignObjectDensity = channelDebug.foreignObjectDensity;
  const anomalyDensity = telemetry.detectorOutput.anomalyDensity;
  const scanQualityScore = telemetry.detectorOutput.scanQualityScore;

  const ctx = telemetry.context;
  const loc = telemetry.scanRegion;

  let verdict: Verdict = "NoImplantDetected";

  // Rules

  const isLowShape = channels.ImplantShapeLikelihoodChannel === "NORMAL";
  const isLowMaterial = channels.MaterialRiskChannel === "LOW";
  const isLowFod = channels.ForeignObjectDensityChannel === "LOW";
  const isLowAnomaly = channels.AnomalyDensityChannel === "LOW";

  if (isLowShape && isLowMaterial && isLowFod && isLowAnomaly) {
    verdict = "NoImplantDetected";
    explanation.push("Low shape likelihood, material risk, object density, and anomaly density.");
  } else {
    const knownBenign =
      channels.KnownImplantMatchChannel === "KNOWN_BENIGN" &&
      channels.ContextualIntentChannel === "BENIGN_CONTEXT";

    if (knownBenign) {
      verdict = "BenignImplantDetected";
      explanation.push("Pattern matches known benign implant in benign context.");
    }

    const suspicious =
      channels.ImplantShapeLikelihoodChannel !== "NORMAL" &&
      (channels.MaterialRiskChannel === "MEDIUM" ||
        channels.MaterialRiskChannel === "HIGH");

    if (!knownBenign && suspicious) {
      verdict = "SuspiciousImplantDetected";
      explanation.push("Non-normal shape likelihood with at least medium material risk.");
    }

    const highRisk =
      channels.ImplantShapeLikelihoodChannel === "LIKELY_IMPLANT" &&
      channels.MaterialRiskChannel === "HIGH" &&
      (channels.LocationCriticalityChannel === "CRITICAL" ||
        channels.ContextualIntentChannel === "HOSTILE_CONTEXT");

    if (highRisk) {
      verdict = "HighRiskImplantDetected";
      explanation.push(
        "High implant likelihood, high material risk, and critical location or hostile context."
      );
    }
  }

  if (channels.ScanQualityChannel === "POOR") {
    explanation.push("Scan quality is poor; confidence reduced.");
  }

  let confidence = baseConfidenceFromChannels({
    shapeLikelihood,
    materialRiskScore,
    foreignObjectDensity,
    anomalyDensity,
    scanQualityScore
  });

  if (channels.ScanQualityChannel === "POOR") {
    confidence *= 0.6;
  }

  const debug = {
    shapeLikelihood,
    materialRiskScore,
    foreignObjectDensity,
    anomalyDensity,
    scanQualityScore
  };

  if (explanation.length === 0) {
    explanation.push("Default rule path; no strong signal in any direction.");
  }

  return {
    verdict,
    confidence,
    channels,
    explanation,
    debug
  };
}
