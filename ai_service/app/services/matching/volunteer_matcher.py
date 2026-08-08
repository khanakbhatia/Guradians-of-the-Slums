"""Explainable deterministic volunteer matching."""

from __future__ import annotations

from app.schemas.volunteers import (
    IncidentSeverity,
    RankedVolunteer,
    VolunteerMatchingRequest,
    VolunteerMatchingResponse,
    VolunteerProfile,
    VolunteerScoreContribution,
)


SCORING_METHOD = "deterministic_weighted_v1"


class VolunteerMatcher:
    """Rank volunteers using explainable scoring, without ML."""

    def match(self, request: VolunteerMatchingRequest) -> VolunteerMatchingResponse:
        """Return ranked volunteers for an incident."""

        ranked = [
            self._rank_candidate(volunteer, request, rank=0)
            for volunteer in request.volunteers
        ]
        ranked.sort(key=lambda item: (item.score, item.confidence), reverse=True)
        ranked = [
            item.model_copy(update={"rank": index + 1})
            for index, item in enumerate(ranked[: request.limit])
        ]
        return VolunteerMatchingResponse(
            incident_id=request.incident_id,
            incident_severity=request.incident_severity,
            ranked_volunteers=ranked,
            scoring_method=SCORING_METHOD,
        )

    def _rank_candidate(
        self,
        volunteer: VolunteerProfile,
        request: VolunteerMatchingRequest,
        rank: int,
    ) -> RankedVolunteer:
        matched_skills = sorted(set(volunteer.skills) & set(request.required_skills))
        missing_skills = sorted(set(request.required_skills) - set(volunteer.skills))

        contributions = [
            self._skill_contribution(volunteer, request, len(matched_skills)),
            self._distance_contribution(volunteer, request.max_distance_km),
            self._availability_contribution(volunteer),
            self._trust_contribution(volunteer),
            self._severity_fit_contribution(volunteer, request.incident_severity),
        ]
        score = round(sum(item.contribution for item in contributions), 3)
        confidence = self._confidence(volunteer, request, contributions)
        reason = self._reason(volunteer, request, matched_skills, missing_skills, score)

        return RankedVolunteer(
            rank=rank,
            volunteer_id=volunteer.volunteer_id,
            name=volunteer.name,
            score=min(1.0, score),
            confidence=confidence,
            reason=reason,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            contributions=contributions,
        )

    @staticmethod
    def _skill_contribution(
        volunteer: VolunteerProfile,
        request: VolunteerMatchingRequest,
        matched_skill_count: int,
    ) -> VolunteerScoreContribution:
        weight = 0.35
        if not request.required_skills:
            value = 1.0 if volunteer.skills else 0.4
            reason = "no required skills were specified, so general skill coverage is used"
        else:
            value = matched_skill_count / len(request.required_skills)
            reason = f"matched {matched_skill_count} of {len(request.required_skills)} required skills"
        return VolunteerScoreContribution(
            factor="skills",
            value=round(value, 3),
            contribution=round(value * weight, 3),
            weight=weight,
            reason=reason,
        )

    @staticmethod
    def _distance_contribution(
        volunteer: VolunteerProfile,
        max_distance_km: float,
    ) -> VolunteerScoreContribution:
        weight = 0.2
        value = max(0.0, 1.0 - (volunteer.distance_km / max_distance_km))
        return VolunteerScoreContribution(
            factor="distance",
            value=volunteer.distance_km,
            contribution=round(value * weight, 3),
            weight=weight,
            reason="closer volunteers receive higher priority for faster dispatch",
        )

    @staticmethod
    def _availability_contribution(volunteer: VolunteerProfile) -> VolunteerScoreContribution:
        weight = 0.2
        if not volunteer.available_now:
            value = 0.0
            reason = "volunteer is not currently available"
        else:
            value = min(1.0, volunteer.available_hours / 8)
            reason = "available volunteers with longer response windows rank higher"
        return VolunteerScoreContribution(
            factor="availability",
            value=volunteer.available_hours if volunteer.available_now else 0,
            contribution=round(value * weight, 3),
            weight=weight,
            reason=reason,
        )

    @staticmethod
    def _trust_contribution(volunteer: VolunteerProfile) -> VolunteerScoreContribution:
        weight = 0.15
        return VolunteerScoreContribution(
            factor="trust_score",
            value=volunteer.trust_score,
            contribution=round(volunteer.trust_score * weight, 3),
            weight=weight,
            reason="higher verified trust score improves assignment confidence",
        )

    @staticmethod
    def _severity_fit_contribution(
        volunteer: VolunteerProfile,
        severity: IncidentSeverity,
    ) -> VolunteerScoreContribution:
        weight = 0.1
        required_trust = {
            IncidentSeverity.LOW: 0.2,
            IncidentSeverity.MODERATE: 0.4,
            IncidentSeverity.HIGH: 0.6,
            IncidentSeverity.CRITICAL: 0.75,
        }[severity]
        value = min(1.0, volunteer.trust_score / required_trust)
        return VolunteerScoreContribution(
            factor="severity_fit",
            value=round(value, 3),
            contribution=round(value * weight, 3),
            weight=weight,
            reason="higher severity requires more trusted volunteers",
        )

    @staticmethod
    def _confidence(
        volunteer: VolunteerProfile,
        request: VolunteerMatchingRequest,
        contributions: list[VolunteerScoreContribution],
    ) -> float:
        completeness = [
            bool(volunteer.volunteer_id),
            volunteer.distance_km >= 0,
            volunteer.available_hours >= 0,
            0 <= volunteer.trust_score <= 1,
            bool(request.incident_severity),
        ]
        signal_strength = sum(item.contribution for item in contributions)
        return round(min(1.0, (sum(completeness) / len(completeness) * 0.6) + signal_strength * 0.4), 3)

    @staticmethod
    def _reason(
        volunteer: VolunteerProfile,
        request: VolunteerMatchingRequest,
        matched_skills: list,
        missing_skills: list,
        score: float,
    ) -> str:
        availability = (
            f"available for {volunteer.available_hours:g} hours"
            if volunteer.available_now
            else "not currently available"
        )
        skill_summary = (
            f"matches {len(matched_skills)} required skills"
            if request.required_skills
            else "evaluated with general skills because no required skills were specified"
        )
        missing_summary = (
            f"; missing {', '.join(skill.value for skill in missing_skills)}"
            if missing_skills
            else ""
        )
        return (
            f"Score {score:.2f}: {skill_summary}{missing_summary}; "
            f"{volunteer.distance_km:g} km away; {availability}; "
            f"trust score {volunteer.trust_score:.2f}."
        )
