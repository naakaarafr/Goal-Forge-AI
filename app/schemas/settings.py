from pydantic import BaseModel
from typing import Optional

class SystemSettingsSchema(BaseModel):
    orgName: str
    domainRestriction: Optional[str] = ""
    defaultCurrency: str
    autoProvision: bool
    maxGoals: str
    minWeightage: str
    requireManagerLock: bool
    enableSelfEvaluation: bool
    lateCheckinDays: str
    escalationDays: str
    autoPingManager: bool
    webhookUrl: Optional[str] = ""
    aiModel: str
    aiTemperature: float
    aiSystemPrompt: str
    enableEntraId: bool
    clientId: Optional[str] = ""
    tenantId: Optional[str] = ""
