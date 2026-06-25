if shapeLikelihood < 0.2 and materialRisk < 0.2:
    verdict = NoImplantDetected

elif knownImplantMatch == TRUE and context == BENIGN:
    verdict = BenignImplantDetected

elif shapeLikelihood > 0.6 and materialRisk > 0.5:
    verdict = SuspiciousImplantDetected

if locationCriticality == CRITICAL and context == HOSTILE:
    verdict = HighRiskImplantDetected
