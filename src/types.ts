export type ScanModality =
  | "XRAY"
  | "MRI"
  | "CT"
  | "ULTRASOUND"
  | "MILLIMETER_WAVE"
  | "OTHER";

export type ScanRegion = "HEAD" | "TORSO" | "ABDOMEN" | "LIMBS" | "FULL_BODY";

export type EnvironmentRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ScanPurpose = "MEDICAL" | "SECURITY" | "FORENSIC" | "OTHER";

export type DensityClass = "LOW" | "MEDIUM" | "HIGH";

export interface Location3D {
  x: number;
  y: number;
  z: number;
}

export interface ForeignObjectCandidate {
  id: string;
  location: Location3D;
  sizeMm: number;
  densityClass: DensityClass;
  shapeDescriptor: string;
}

export interface MaterialClassProbabilities {
  metal: number;
  ceramic: number;
  polymer: number;
  biological: number;
}

export interface DetectorOutput {
  foreignObjectCandidates: ForeignObjectCandidate[];
  materialClassProbabilities: MaterialClassProbabilities;
  implantShapeLikelihood: number;
  anomalyDensity: number;
  signalNoiseRatio: number;
  scanQualityScore: number;
}

export interface ScanContext {
  scanPurpose: ScanPurpose;
  environmentRiskLevel: EnvironmentRiskLevel;
  operatorId: string;
}

export type DeviceCalibrationState = "OK" | "WARNING" | "ERROR" | "UNKNOWN";

export interface TelemetryMetadata {
  deviceModel: string;
  deviceCalibrationState: DeviceCalibrationState;
  softwareVersion: string;
}

export interface BodyScanTelemetry {
  scanId: string;
  subjectId: string;
  scanModality: ScanModality;
  scanRegion: ScanRegion;
  timestamp: string;
  detectorOutput: DetectorOutput;
  context: ScanContext;
  metadata: TelemetryMetadata;
}

// Channels

export type ForeignObjectDensityLevel = "LOW" | "MEDIUM" | "HIGH";
export type ImplantShapeLikelihoodLevel = "NORMAL" | "SUSPICIOUS" | "LIKELY_IMPLANT";
export type MaterialRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type LocationCriticalityLevel = "BASELINE" | "ELEVATED" | "CRITICAL";
export type ContextualIntentLevel = "BENIGN_CONTEXT" | "MIXED_CONTEXT" | "HOSTILE_CONTEXT";
export type ScanQualityLevel = "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
export type AnomalyDensityLevel = "LOW" | "MEDIUM" | "HIGH";
export type KnownImplantMatchLevel = "NONE" | "KNOWN_BENIGN" | "UNKNOWN_PATTERN";

export interface Channels {
  ForeignObjectDensityChannel: ForeignObjectDensityLevel;
  ImplantShapeLikelihoodChannel: ImplantShapeLikelihoodLevel;
  MaterialRiskChannel: MaterialRiskLevel;
  LocationCriticalityChannel: LocationCriticalityLevel;
  ContextualIntentChannel: ContextualIntentLevel;
  ScanQualityChannel: ScanQualityLevel;
  AnomalyDensityChannel: AnomalyDensityLevel;
  KnownImplantMatchChannel: KnownImplantMatchLevel;
}

// Engine output

export type Verdict =
  | "NoImplantDetected"
  | "BenignImplantDetected"
  | "SuspiciousImplantDetected"
  | "HighRiskImplantDetected";

export interface EngineDebug {
  shapeLikelihood: number;
  materialRiskScore: number;
  foreignObjectDensity: number;
  anomalyDensity: number;
  scanQualityScore: number;
}

export interface ImplantDetectionEngineOutput {
  verdict: Verdict;
  confidence: number;
  channels: Channels;
  explanation: string[];
  debug?: EngineDebug;
}
