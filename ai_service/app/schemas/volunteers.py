"""Request and response schemas for explainable volunteer matching."""

from enum import StrEnum

from pydantic import BaseModel, Field


class VolunteerSkill(StrEnum):
    """Supported volunteer skills."""

    FIRST_AID = "first_aid"
    SEARCH_AND_RESCUE = "search_and_rescue"
    EVACUATION_SUPPORT = "evacuation_support"
    FOOD_DISTRIBUTION = "food_distribution"
    WATER_SANITATION = "water_sanitation"
    SHELTER_MANAGEMENT = "shelter_management"
    LOGISTICS = "logistics"
    LOCAL_LANGUAGE = "local_language"
    MEDICAL = "medical"
    CROWD_MANAGEMENT = "crowd_management"


class IncidentSeverity(StrEnum):
    """Incident severity bands."""

    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class VolunteerProfile(BaseModel):
    """Volunteer candidate input."""

    volunteer_id: str
    name: str | None = None
    skills: list[VolunteerSkill] = Field(default_factory=list)
    distance_km: float = Field(ge=0)
    available_now: bool
    available_hours: float = Field(default=0.0, ge=0)
    trust_score: float = Field(ge=0.0, le=1.0)


class VolunteerMatchingRequest(BaseModel):
    """Volunteer matching request."""

    incident_id: str
    required_skills: list[VolunteerSkill] = Field(default_factory=list)
    incident_severity: IncidentSeverity
    volunteers: list[VolunteerProfile]
    max_distance_km: float = Field(default=10.0, gt=0)
    limit: int = Field(default=20, ge=1, le=100)


class VolunteerScoreContribution(BaseModel):
    """Explainable contribution to the volunteer score."""

    factor: str
    value: float | int | str | bool | None
    contribution: float = Field(ge=0.0, le=1.0)
    weight: float = Field(ge=0.0, le=1.0)
    reason: str


class RankedVolunteer(BaseModel):
    """Ranked volunteer output."""

    rank: int
    volunteer_id: str
    name: str | None = None
    score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    matched_skills: list[VolunteerSkill]
    missing_skills: list[VolunteerSkill]
    contributions: list[VolunteerScoreContribution]


class VolunteerMatchingResponse(BaseModel):
    """Volunteer matching response."""

    incident_id: str
    incident_severity: IncidentSeverity
    ranked_volunteers: list[RankedVolunteer]
    scoring_method: str
