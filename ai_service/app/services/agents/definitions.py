"""Granite agent role definitions."""

from app.schemas.agents import BeeAIAgentDefinition, BeeAIAgentName, BeeAIWorkflowStep


AGENT_DEFINITIONS = [
    BeeAIAgentDefinition(
        name=BeeAIAgentName.RISK_ANALYST,
        display_name="Risk Analyst",
        role="Analyzes flood, fire, infrastructure, and evacuation risk signals.",
        goal="Identify the most urgent risks, confidence, and feature drivers using available AI service outputs.",
        memory="Workflow shared context plus Granite-backed incident memory during the incident run.",
        tools=["risk_scoring_tool", "rag_retrieval_tool"],
        output="Risk summary with score drivers, uncertainty, and visualization-ready findings.",
    ),
    BeeAIAgentDefinition(
        name=BeeAIAgentName.VOLUNTEER_COORDINATOR,
        display_name="Volunteer Coordinator",
        role="Maps response needs to volunteer capacity and NGO field operations.",
        goal="Prioritize volunteer actions, staging needs, safety checks, and coordination gaps.",
        memory="Workflow shared context plus prior specialist outputs in the same Granite run.",
        tools=["rag_retrieval_tool", "grounded_granite_tool"],
        output="Volunteer tasking plan with grounded safety constraints and handoff notes.",
    ),
    BeeAIAgentDefinition(
        name=BeeAIAgentName.EMERGENCY_PLANNER,
        display_name="Emergency Planner",
        role="Plans evacuation, access, shelter routing, and operational sequencing.",
        goal="Turn risk and road-network findings into safe operational movement priorities.",
        memory="Workflow shared context plus risk analyst and volunteer coordinator outputs.",
        tools=["graph_analysis_tool", "rag_retrieval_tool"],
        output="Evacuation and emergency action plan suitable for authority review.",
    ),
    BeeAIAgentDefinition(
        name=BeeAIAgentName.RESOURCE_ALLOCATOR,
        display_name="Resource Allocator",
        role="Allocates medical teams, food, water, rescue teams, and shelters.",
        goal="Assign scarce resources to high-priority zones using risk, distance, availability, and priority.",
        memory="Shared workflow context plus risk, volunteer, and emergency planning outputs.",
        tools=["resource_allocation_tool", "rag_retrieval_tool"],
        output="Explainable resource allocation plan with unmet needs and confidence.",
    ),
    BeeAIAgentDefinition(
        name=BeeAIAgentName.REPORT_GENERATOR,
        display_name="Report Generator",
        role="Creates grounded incident reports, NGO plans, and authority briefings.",
        goal="Generate formal outputs using IBM Granite only through retrieved RAG grounding.",
        memory="Workflow shared context plus all previous specialist outputs.",
        tools=["grounded_granite_tool", "rag_retrieval_tool"],
        output="Grounded incident report, NGO action plan, and authority briefing sections.",
    ),
    BeeAIAgentDefinition(
        name=BeeAIAgentName.CITIZEN_ASSISTANT,
        display_name="Citizen Assistant",
        role="Creates citizen-safe alert language from approved grounded guidance.",
        goal="Produce concise, multilingual public alerts with no ungrounded advice.",
        memory="Workflow shared context plus report generator output.",
        tools=["grounded_granite_tool", "rag_retrieval_tool"],
        output="Citizen alert messages and multilingual alert variants.",
    ),
]


def build_workflow_steps(
    incident_context: str,
    include_citizen_alert: bool,
    include_authority_briefing: bool,
    include_ngo_plan: bool,
    target_languages: list[str],
) -> list[BeeAIWorkflowStep]:
    """Create the incident workflow plan."""

    steps = [
        BeeAIWorkflowStep(
            step_id="risk-analysis",
            agent=BeeAIAgentName.RISK_ANALYST,
            prompt=(
                "Analyze the incident risk context. Use available tools for risk and retrieval. "
                f"Incident: {incident_context}"
            ),
            expected_output="Flood/fire/overall risk summary with confidence and key contributing features.",
        ),
        BeeAIWorkflowStep(
            step_id="volunteer-coordination",
            agent=BeeAIAgentName.VOLUNTEER_COORDINATOR,
            prompt=(
                "Create a volunteer coordination view using the risk findings and grounded SOP context. "
                f"Incident: {incident_context}"
            ),
            expected_output="Volunteer priorities, staging notes, and NGO coordination constraints.",
            depends_on=["risk-analysis"],
        ),
        BeeAIWorkflowStep(
            step_id="emergency-planning",
            agent=BeeAIAgentName.EMERGENCY_PLANNER,
            prompt=(
                "Plan emergency response and evacuation priorities using road graph, drainage, and risk context. "
                f"Incident: {incident_context}"
            ),
            expected_output="Evacuation priorities, bottlenecks, blocked roads, and safe action sequence.",
            depends_on=["risk-analysis", "volunteer-coordination"],
        ),
    ]

    report_outputs = ["incident report"]
    if include_ngo_plan:
        report_outputs.append("NGO action plan")
    if include_authority_briefing:
        report_outputs.append("authority briefing")

    steps.append(
        BeeAIWorkflowStep(
            step_id="resource-allocation",
            agent=BeeAIAgentName.RESOURCE_ALLOCATOR,
            prompt=(
                "Allocate response resources using risk, distance, availability, and priority. "
                "Use resource_allocation_tool when structured resource data is available. "
                f"Incident: {incident_context}"
            ),
            expected_output="Explainable allocations for medical teams, food, water, rescue teams, and shelters.",
            depends_on=["risk-analysis", "volunteer-coordination", "emergency-planning"],
        )
    )

    steps.append(
        BeeAIWorkflowStep(
            step_id="grounded-reporting",
            agent=BeeAIAgentName.REPORT_GENERATOR,
            prompt=(
                "Generate grounded formal response outputs using only RAG-backed IBM Granite tools. "
                f"Required outputs: {', '.join(report_outputs)}. Incident: {incident_context}"
            ),
            expected_output="Grounded formal outputs with citations and explicit information gaps.",
            depends_on=[
                "risk-analysis",
                "volunteer-coordination",
                "emergency-planning",
                "resource-allocation",
            ],
        )
    )

    if include_citizen_alert:
        language_hint = ", ".join(target_languages) if target_languages else "English"
        steps.append(
            BeeAIWorkflowStep(
                step_id="citizen-alerting",
                agent=BeeAIAgentName.CITIZEN_ASSISTANT,
                prompt=(
                    "Create citizen-facing alerts using only grounded guidance from retrieved sources. "
                    f"Languages: {language_hint}. Incident: {incident_context}"
                ),
                expected_output="Plain-language citizen alert messages suitable for public broadcast.",
                depends_on=["grounded-reporting"],
            )
        )

    return steps
