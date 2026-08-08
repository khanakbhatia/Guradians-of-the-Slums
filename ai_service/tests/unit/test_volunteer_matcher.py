from app.schemas.volunteers import (
    IncidentSeverity,
    VolunteerMatchingRequest,
    VolunteerProfile,
    VolunteerSkill,
)
from app.services.matching.volunteer_matcher import VolunteerMatcher


def test_volunteer_matcher_ranks_best_available_skill_match_first() -> None:
    request = VolunteerMatchingRequest(
        incident_id="incident-1",
        incident_severity=IncidentSeverity.HIGH,
        required_skills=[VolunteerSkill.FIRST_AID, VolunteerSkill.EVACUATION_SUPPORT],
        volunteers=[
            VolunteerProfile(
                volunteer_id="v1",
                skills=[VolunteerSkill.FOOD_DISTRIBUTION],
                distance_km=1,
                available_now=True,
                available_hours=8,
                trust_score=0.9,
            ),
            VolunteerProfile(
                volunteer_id="v2",
                skills=[VolunteerSkill.FIRST_AID, VolunteerSkill.EVACUATION_SUPPORT],
                distance_km=2,
                available_now=True,
                available_hours=6,
                trust_score=0.8,
            ),
        ],
    )

    response = VolunteerMatcher().match(request)

    assert response.ranked_volunteers[0].volunteer_id == "v2"
    assert response.ranked_volunteers[0].reason
    assert response.ranked_volunteers[0].confidence > 0
