/**
 * docs/swaggerComponents.js
 * Not an executable module — this file exists purely to hold shared
 * `@swagger` component schema JSDoc blocks that routes/v1/*.js reference
 * via $ref. One schema per model, each carrying a top-level `example` so
 * every endpoint that $refs it renders a complete example automatically —
 * that's the leverage point: examples live here once, not copy-pasted
 * into 100+ individual endpoint definitions.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # ---------------------------------------------------------------
 *     # Envelope shapes — every response uses one of these two.
 *     # ---------------------------------------------------------------
 *     ApiSuccessResponse:
 *       type: object
 *       description: Standard success envelope. `data` shape varies per endpoint (see that endpoint's response schema); `meta` is present only on paginated list endpoints.
 *       properties:
 *         success: { type: boolean, example: true }
 *         message: { type: string, example: "Success" }
 *         data: { type: object }
 *         meta: { $ref: '#/components/schemas/PaginationMeta' }
 *
 *     ApiErrorResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string, example: "Resource not found" }
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field: { type: string, example: "email" }
 *               message: { type: string, example: "A valid email is required" }
 *       example:
 *         success: false
 *         message: "Validation failed"
 *         errors: [{ field: "email", message: "A valid email is required" }]
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page: { type: integer, example: 1 }
 *         limit: { type: integer, example: 20 }
 *         totalItems: { type: integer, example: 143 }
 *         totalPages: { type: integer, example: 8 }
 *         hasNextPage: { type: boolean, example: true }
 *         hasPrevPage: { type: boolean, example: false }
 *
 *     # ---------------------------------------------------------------
 *     # User
 *     # ---------------------------------------------------------------
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439011" }
 *         name: { type: string, example: "Priya Sharma" }
 *         email: { type: string, format: email, example: "priya@example.com" }
 *         phone: { type: string, example: "+919876543210" }
 *         role: { type: string, enum: [citizen, volunteer, authority, admin], example: "volunteer" }
 *         avatar:
 *           type: object
 *           nullable: true
 *           properties:
 *             url: { type: string, example: "https://res.cloudinary.com/demo/avatars/abc123.jpg" }
 *             publicId: { type: string, example: "avatars/abc123" }
 *         preferredLanguage: { type: string, example: "en" }
 *         isEmailVerified: { type: boolean, example: true }
 *         isActive: { type: boolean, example: true }
 *         createdAt: { type: string, format: date-time, example: "2026-07-01T09:15:00.000Z" }
 *         updatedAt: { type: string, format: date-time, example: "2026-08-01T10:00:00.000Z" }
 *       example:
 *         _id: "507f1f77bcf86cd799439011"
 *         name: "Priya Sharma"
 *         email: "priya@example.com"
 *         phone: "+919876543210"
 *         role: "volunteer"
 *         avatar: null
 *         preferredLanguage: "en"
 *         isEmailVerified: true
 *         isActive: true
 *         createdAt: "2026-07-01T09:15:00.000Z"
 *         updatedAt: "2026-08-01T10:00:00.000Z"
 *
 *     PublicUser:
 *       description: Reduced projection shown when the requester is neither the profile owner nor an admin.
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439011" }
 *         name: { type: string, example: "Priya Sharma" }
 *         avatar: { type: object, nullable: true }
 *         role: { type: string, example: "volunteer" }
 *         preferredLanguage: { type: string, example: "en" }
 *         createdAt: { type: string, format: date-time }
 *
 *     # ---------------------------------------------------------------
 *     # RiskZone
 *     # ---------------------------------------------------------------
 *     RiskZone:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439021" }
 *         blockId: { type: string, example: "BLOCK-14" }
 *         name: { type: string, example: "Riverside Block 14" }
 *         settlement: { type: string, example: "Dharavi" }
 *         geometry:
 *           type: object
 *           properties:
 *             type: { type: string, enum: [Polygon], example: "Polygon" }
 *             coordinates: { type: array, example: [[[72.85, 19.05], [72.86, 19.05], [72.86, 19.06], [72.85, 19.06], [72.85, 19.05]]] }
 *         hazardType: { type: string, enum: [flood, fire, structural, landslide, other], example: "flood" }
 *         riskScore: { type: number, minimum: 0, maximum: 100, example: 78 }
 *         riskLevel: { type: string, enum: [low, moderate, high, critical], example: "high" }
 *         confidence: { type: number, minimum: 0, maximum: 1, example: 0.86 }
 *         contributingFactors:
 *           type: array
 *           items:
 *             type: object
 *             properties: { factor: { type: string }, weight: { type: number } }
 *           example: [{ factor: "drainage_capacity", weight: 0.4 }, { factor: "rainfall_forecast", weight: 0.35 }]
 *         populationEstimate: { type: integer, example: 2400 }
 *         dataSource: { type: string, enum: [satellite, citizen_report, historical, manual, agent_reassessment], example: "satellite" }
 *         lastAnalyzedAt: { type: string, format: date-time, example: "2026-08-06T04:00:00.000Z" }
 *         createdAt: { type: string, format: date-time }
 *
 *     # ---------------------------------------------------------------
 *     # Incident
 *     # ---------------------------------------------------------------
 *     Incident:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439031" }
 *         title: { type: string, example: "Flooding in Block 14" }
 *         type: { type: string, enum: [flood, fire, structural_collapse, landslide, disease_outbreak, other], example: "flood" }
 *         severity: { type: string, enum: [low, medium, high, critical], example: "high" }
 *         status: { type: string, enum: [reported, active, contained, resolved, archived], example: "active" }
 *         riskZone: { type: string, example: "507f1f77bcf86cd799439021" }
 *         location:
 *           type: object
 *           properties: { type: { type: string, example: "Point" }, coordinates: { type: array, items: { type: number }, example: [72.8777, 19.0760] } }
 *         description: { type: string, example: "Water rising fast near the primary drainage channel." }
 *         affectedPopulationEstimate: { type: integer, example: 1800 }
 *         startedAt: { type: string, format: date-time, example: "2026-08-06T10:00:00.000Z" }
 *         resolvedAt: { type: string, format: date-time, nullable: true, example: null }
 *         statusHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               changedAt: { type: string, format: date-time }
 *               changedBy: { type: string, nullable: true }
 *               note: { type: string, nullable: true }
 *           example: [{ status: "reported", changedAt: "2026-08-06T10:00:00.000Z", changedBy: null, note: null }, { status: "active", changedAt: "2026-08-06T10:20:00.000Z", changedBy: "507f1f77bcf86cd799439041", note: "Confirmed on ground" }]
 *         createdAt: { type: string, format: date-time }
 *
 *     # ---------------------------------------------------------------
 *     # Volunteer / Authority
 *     # ---------------------------------------------------------------
 *     Volunteer:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439041" }
 *         user: { $ref: '#/components/schemas/PublicUser' }
 *         skills:
 *           type: array
 *           items: { type: string, enum: [medical, rescue, logistics, communication, construction, counseling, other] }
 *           example: ["medical", "logistics"]
 *         ngoAffiliation: { type: string, nullable: true, example: "Red Cross Mumbai" }
 *         verified: { type: boolean, example: false }
 *         trustScore: { type: number, minimum: 0, maximum: 100, example: 62 }
 *         rating: { type: number, nullable: true, example: 4.5 }
 *         completedTasksCount: { type: integer, example: 7 }
 *         availability: { type: string, enum: [available, busy, offline], example: "available" }
 *         serviceRadiusKm: { type: number, example: 5 }
 *         createdAt: { type: string, format: date-time }
 *
 *     Authority:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439051" }
 *         user: { $ref: '#/components/schemas/PublicUser' }
 *         department: { type: string, example: "Municipal Flood Control" }
 *         designation: { type: string, example: "Field Officer" }
 *         officeContact: { type: string, example: "+912233445566" }
 *         verified: { type: boolean, example: true }
 *
 *     # ---------------------------------------------------------------
 *     # CitizenReport
 *     # ---------------------------------------------------------------
 *     CitizenReport:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439061" }
 *         reporter: { $ref: '#/components/schemas/PublicUser' }
 *         incident: { type: string, nullable: true, example: null }
 *         riskZone: { type: string, nullable: true, example: "507f1f77bcf86cd799439021" }
 *         hazardType: { type: string, enum: [flood, fire, structural, landslide, blocked_drainage, other], example: "blocked_drainage" }
 *         severity: { type: string, enum: [low, medium, high, critical], example: "medium" }
 *         description: { type: string, example: "Drainage blocked near the school entrance, water pooling." }
 *         photos:
 *           type: array
 *           items:
 *             type: object
 *             properties: { url: { type: string }, publicId: { type: string } }
 *           example: [{ url: "https://res.cloudinary.com/demo/citizen-reports/xyz.jpg", publicId: "citizen-reports/xyz" }]
 *         location:
 *           type: object
 *           properties: { type: { type: string, example: "Point" }, coordinates: { type: array, items: { type: number }, example: [72.87, 19.07] } }
 *         reliabilityScore: { type: number, minimum: 0, maximum: 100, example: 60 }
 *         status: { type: string, enum: [pending, verified, flagged, rejected, resolved], example: "pending" }
 *         verifiedBy: { type: string, nullable: true, example: null }
 *         reviewNote: { type: string, nullable: true, example: null }
 *         createdAt: { type: string, format: date-time }
 *
 *     # ---------------------------------------------------------------
 *     # Task
 *     # ---------------------------------------------------------------
 *     Task:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439071" }
 *         title: { type: string, example: "Clear drainage in Block 14" }
 *         description: { type: string, example: "Manually clear debris from the blocked channel near the school." }
 *         incident: { type: string, example: "507f1f77bcf86cd799439031" }
 *         taskType: { type: string, enum: [evacuation_assist, medical, logistics, drainage_clearance, damage_assessment, other], example: "drainage_clearance" }
 *         priority: { type: string, enum: [low, medium, high, critical], example: "high" }
 *         status: { type: string, enum: [open, assigned, in_progress, completed, cancelled], example: "open" }
 *         requiredSkills:
 *           type: array
 *           items: { type: string }
 *           example: ["logistics"]
 *         location:
 *           type: object
 *           properties: { type: { type: string, example: "Point" }, coordinates: { type: array, items: { type: number }, example: [72.87, 19.07] } }
 *         assignedVolunteer: { type: string, nullable: true, example: null }
 *         estimatedTimeMinutes: { type: integer, example: 45 }
 *         acceptedAt: { type: string, format: date-time, nullable: true, example: null }
 *         startedAt: { type: string, format: date-time, nullable: true, example: null }
 *         completedAt: { type: string, format: date-time, nullable: true, example: null }
 *         createdAt: { type: string, format: date-time }
 *
 *     # ---------------------------------------------------------------
 *     # Notification
 *     # ---------------------------------------------------------------
 *     Notification:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439081" }
 *         recipient: { type: string, example: "507f1f77bcf86cd799439011" }
 *         type: { type: string, enum: [alert, task_assigned, task_update, chat_message, system, report_status], example: "alert" }
 *         title: { type: string, example: "Flood Warning" }
 *         message: { type: string, example: "Evacuate low-lying areas near Block 14 immediately." }
 *         channel: { type: string, enum: [in_app, sms, push, email], example: "in_app" }
 *         priority: { type: string, enum: [low, normal, high, urgent], example: "urgent" }
 *         language: { type: string, example: "en" }
 *         isRead: { type: boolean, example: false }
 *         readAt: { type: string, format: date-time, nullable: true, example: null }
 *         createdAt: { type: string, format: date-time }
 *
 *     # ---------------------------------------------------------------
 *     # ChatRoom / Message
 *     # ---------------------------------------------------------------
 *     ChatRoom:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd799439091" }
 *         name: { type: string, nullable: true, example: "Block 14 Coordination" }
 *         roomType: { type: string, enum: [incident, direct, support], example: "incident" }
 *         incident: { type: string, nullable: true, example: "507f1f77bcf86cd799439031" }
 *         participants:
 *           type: array
 *           items: { $ref: '#/components/schemas/PublicUser' }
 *         isActive: { type: boolean, example: true }
 *         lastMessageAt: { type: string, format: date-time, nullable: true, example: "2026-08-06T11:00:00.000Z" }
 *         createdAt: { type: string, format: date-time }
 *
 *     Message:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd7994390a1" }
 *         chatRoom: { type: string, example: "507f1f77bcf86cd799439091" }
 *         sender: { $ref: '#/components/schemas/PublicUser' }
 *         content: { type: string, nullable: true, example: "On my way to Block 14 now." }
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties: { url: { type: string }, publicId: { type: string }, mimeType: { type: string } }
 *           example: []
 *         readBy:
 *           type: array
 *           items:
 *             type: object
 *             properties: { user: { type: string }, readAt: { type: string, format: date-time } }
 *           example: []
 *         isDeleted: { type: boolean, example: false }
 *         createdAt: { type: string, format: date-time }
 *
 *     # ---------------------------------------------------------------
 *     # ActivityLog / Media
 *     # ---------------------------------------------------------------
 *     ActivityLog:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd7994390b1" }
 *         actor: { type: string, nullable: true, example: "507f1f77bcf86cd799439011" }
 *         performedBySystem: { type: boolean, example: false }
 *         agentName: { type: string, nullable: true, example: null }
 *         action: { type: string, example: "TASK_ACCEPTED" }
 *         entityType: { type: string, enum: [User, Task, Incident, CitizenReport, RiskZone, ChatRoom, Notification, Media], example: "Task" }
 *         entityId: { type: string, example: "507f1f77bcf86cd799439071" }
 *         metadata: { type: object, example: { volunteerId: "507f1f77bcf86cd799439041" } }
 *         createdAt: { type: string, format: date-time }
 *
 *     Media:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "507f1f77bcf86cd7994390c1" }
 *         uploader: { type: string, example: "507f1f77bcf86cd799439011" }
 *         category: { type: string, enum: [satellite, citizen_image, document], example: "citizen_image" }
 *         originalFilename: { type: string, example: "flood-photo.jpg" }
 *         mimeType: { type: string, example: "image/jpeg" }
 *         format: { type: string, example: "jpg" }
 *         sizeBytes: { type: integer, example: 2458112 }
 *         storedSizeBytes: { type: integer, example: 184320 }
 *         width: { type: integer, nullable: true, example: 1600 }
 *         height: { type: integer, nullable: true, example: 1067 }
 *         checksum: { type: string, example: "a3f5c9..." }
 *         url: { type: string, example: "https://res.cloudinary.com/demo/citizen-images/abc.jpg" }
 *         publicId: { type: string, example: "citizen-images/abc" }
 *         resourceType: { type: string, enum: [image, raw], example: "image" }
 *         status: { type: string, enum: [ready, failed], example: "ready" }
 *         createdAt: { type: string, format: date-time }
 *
 *   responses:
 *     UnauthorizedError:
 *       description: Missing, invalid, or expired access token
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *           example: { success: false, message: "Not authenticated — missing access token" }
 *     ForbiddenError:
 *       description: Authenticated but not permitted (wrong role or not the resource owner)
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *           example: { success: false, message: "Role \"citizen\" is not permitted to perform this action" }
 *     NotFoundError:
 *       description: Resource does not exist
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *           example: { success: false, message: "Resource not found" }
 *     ValidationError:
 *       description: Request failed validation
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *           example: { success: false, message: "Validation failed", errors: [{ field: "email", message: "A valid email is required" }] }
 */
