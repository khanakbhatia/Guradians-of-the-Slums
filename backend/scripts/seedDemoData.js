/**
 * scripts/seedDemoData.js
 * Populates MongoDB with realistic, demo-ready disaster data for the
 * Guardians of the Slums dashboards.
 *
 * WHY THIS EXISTS
 * The dashboards were rendering empty ("0 zones monitored", "No active
 * alerts", blank charts) not because of frontend or API bugs, but simply
 * because the database had almost no documents in it. Every authority
 * widget is a live aggregation over RiskZone / Incident / Volunteer /
 * CitizenReport, so with an empty database they correctly render empty
 * states. This script gives them something real to aggregate.
 *
 * WHAT IT SEEDS (and which widget each row feeds)
 *   RiskZone       -> Risk heatmap ("N zones monitored") AND Recent alerts
 *                     (alerts are derived from riskLevel high/critical zones)
 *   Incident       -> Incident feed, Severity mix (status='active'),
 *                     Zone load (active vs resolved), 7-day incident trend
 *   Volunteer      -> Volunteer summary table, "active volunteers" stat
 *   CitizenReport  -> Task approval queue (status='pending')
 *   Notification   -> Notification bell
 *   Task           -> Volunteer dashboard "nearby/open requests"
 *
 * IDEMPOTENT: re-running replaces the seeded demo documents rather than
 * duplicating them. Seeded docs are tagged so they can be found again:
 *   - users by their @guardians.demo email domain
 *   - risk zones by their DEMO-* blockId prefix
 * Anything you created by hand through the UI is left untouched, EXCEPT
 * when run with --wipe (see below).
 *
 * USAGE
 *   node scripts/seedDemoData.js           # add/refresh demo data
 *   node scripts/seedDemoData.js --wipe    # delete ALL docs in these
 *                                          # collections first, then seed
 *
 * Demo logins (all use password: Demo@12345)
 *   authority@guardians.demo  (authority)
 *   admin@guardians.demo      (admin)
 *   priya@guardians.demo      (volunteer)
 *   rahul@guardians.demo      (citizen)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../config/env');
const User = require('../models/User.model');
const Volunteer = require('../models/Volunteer.model');
const RiskZone = require('../models/RiskZone.model');
const Incident = require('../models/Incident.model');
const CitizenReport = require('../models/CitizenReport.model');
const Notification = require('../models/Notification.model');
const Task = require('../models/Task.model');

const DEMO_EMAIL_DOMAIN = '@guardians.demo';
const DEMO_PASSWORD = 'Demo@12345';
const DEMO_BLOCK_PREFIX = 'DEMO-';
const WIPE = process.argv.includes('--wipe');

const log = (...args) => console.log('[seed]', ...args);

/** Days-ago Date helper, used to spread data across the 7-day trend window. */
const daysAgo = (days, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d;
};

/**
 * Mongoose overwrites createdAt on insert, but the "Incident volume - last
 * 7 days" chart groups by createdAt. So we create documents normally (so
 * validation + pre-save hooks like riskLevel derivation and statusHistory
 * seeding still run), then backdate the timestamp through the raw driver,
 * which bypasses the timestamps plugin.
 */
const backdate = async (Model, id, createdAt) => {
  await Model.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(String(id)) },
    { $set: { createdAt, updatedAt: createdAt } }
  );
};

/** Small square polygon around a centre point, for zone geometry. */
const squareAround = (lng, lat, size = 0.004) => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - size, lat - size],
      [lng + size, lat - size],
      [lng + size, lat + size],
      [lng - size, lat + size],
      [lng - size, lat - size], // GeoJSON: first point must equal last
    ],
  ],
});

const point = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] });

// Real Mumbai informal-settlement areas, matching the map view the
// dashboard already centres on.
const ZONES = [
  { blockId: 'DEMO-DHARAVI-01', name: 'Dharavi Sector 1', settlement: 'Dharavi', lng: 72.8506, lat: 19.0380, hazardType: 'flood', riskScore: 88, confidence: 0.91, populationEstimate: 12400 },
  { blockId: 'DEMO-DHARAVI-02', name: 'Dharavi Sector 4', settlement: 'Dharavi', lng: 72.8560, lat: 19.0425, hazardType: 'fire', riskScore: 76, confidence: 0.84, populationEstimate: 9800 },
  { blockId: 'DEMO-GOVANDI-01', name: 'Govandi East Block A', settlement: 'Govandi', lng: 72.9200, lat: 19.0530, hazardType: 'flood', riskScore: 82, confidence: 0.88, populationEstimate: 7600 },
  { blockId: 'DEMO-MANKHURD-01', name: 'Mankhurd Transit Camp', settlement: 'Mankhurd', lng: 72.9350, lat: 19.0480, hazardType: 'structural', riskScore: 64, confidence: 0.72, populationEstimate: 5300 },
  { blockId: 'DEMO-BANDRA-01', name: 'Bandra East Slope', settlement: 'Bandra East', lng: 72.8420, lat: 19.0600, hazardType: 'landslide', riskScore: 58, confidence: 0.69, populationEstimate: 4100 },
  { blockId: 'DEMO-KURLA-01', name: 'Kurla Pipeline Road', settlement: 'Kurla', lng: 72.8790, lat: 19.0680, hazardType: 'flood', riskScore: 71, confidence: 0.80, populationEstimate: 6900 },
  { blockId: 'DEMO-WADALA-01', name: 'Wadala Marsh Edge', settlement: 'Wadala', lng: 72.8650, lat: 19.0180, hazardType: 'flood', riskScore: 45, confidence: 0.63, populationEstimate: 3200 },
  { blockId: 'DEMO-SION-01', name: 'Sion Koliwada', settlement: 'Sion', lng: 72.8620, lat: 19.0400, hazardType: 'fire', riskScore: 33, confidence: 0.58, populationEstimate: 2800 },
];

async function upsertUser({ name, email, role, phone, lng, lat }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      name,
      email,
      password: DEMO_PASSWORD,
      role,
      phone,
      isEmailVerified: true,
      isActive: true,
      location: lng ? point(lng, lat) : null,
    });
    await user.save(); // .save() (not insertMany) so the password-hash hook runs
  }
  return user;
}

async function run() {
  const mongoUri = env.MONGO_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not set (check backend/.env)');

  await mongoose.connect(mongoUri);
  log('connected to MongoDB');

  if (WIPE) {
    log('--wipe passed: clearing collections...');
    await Promise.all([
      Notification.deleteMany({}),
      Task.deleteMany({}),
      CitizenReport.deleteMany({}),
      Incident.deleteMany({}),
      RiskZone.deleteMany({}),
      Volunteer.deleteMany({}),
      User.deleteMany({ email: new RegExp(`${DEMO_EMAIL_DOMAIN}$`, 'i') }),
    ]);
  } else {
    // Idempotent refresh: remove only previously-seeded demo documents.
    const oldZones = await RiskZone.find({ blockId: new RegExp(`^${DEMO_BLOCK_PREFIX}`) }).select('_id').lean();
    const oldZoneIds = oldZones.map((z) => z._id);
    if (oldZoneIds.length) {
      const oldIncidents = await Incident.find({ riskZone: { $in: oldZoneIds } }).select('_id').lean();
      const oldIncidentIds = oldIncidents.map((i) => i._id);
      await Task.deleteMany({ incident: { $in: oldIncidentIds } });
      await CitizenReport.deleteMany({ riskZone: { $in: oldZoneIds } });
      await Incident.deleteMany({ _id: { $in: oldIncidentIds } });
      await RiskZone.deleteMany({ _id: { $in: oldZoneIds } });
      log(`removed ${oldZoneIds.length} previously-seeded zones and their children`);
    }
  }

  // ---------------------------------------------------------------- users
  const authority = await upsertUser({ name: 'Anita Deshmukh', email: `authority${DEMO_EMAIL_DOMAIN}`, role: 'authority', phone: '+919810000001', lng: 72.8506, lat: 19.0380 });
  const admin = await upsertUser({ name: 'System Admin', email: `admin${DEMO_EMAIL_DOMAIN}`, role: 'admin', phone: '+919810000002' });

  const volunteerSpecs = [
    { name: 'Priya Nair', email: `priya${DEMO_EMAIL_DOMAIN}`, phone: '+919810000010', skills: ['medical', 'rescue'], availability: 'available', trustScore: 92, rating: 4.8, completed: 34, ngo: 'Apnalaya', lng: 72.8510, lat: 19.0390, status: 'approved', verified: true },
    { name: 'Imran Shaikh', email: `imran${DEMO_EMAIL_DOMAIN}`, phone: '+919810000011', skills: ['rescue', 'logistics'], availability: 'busy', trustScore: 85, rating: 4.5, completed: 27, ngo: 'Yuva', lng: 72.9210, lat: 19.0540, status: 'approved', verified: true },
    { name: 'Sunita Kamble', email: `sunita${DEMO_EMAIL_DOMAIN}`, phone: '+919810000012', skills: ['medical', 'counseling'], availability: 'available', trustScore: 78, rating: 4.3, completed: 19, ngo: 'SNEHA', lng: 72.8570, lat: 19.0430, status: 'approved', verified: true },
    { name: 'Arjun Patil', email: `arjun${DEMO_EMAIL_DOMAIN}`, phone: '+919810000013', skills: ['construction', 'logistics'], availability: 'available', trustScore: 71, rating: 4.1, completed: 12, ngo: null, lng: 72.9360, lat: 19.0490, status: 'approved', verified: false },
    { name: 'Fatima Ansari', email: `fatima${DEMO_EMAIL_DOMAIN}`, phone: '+919810000014', skills: ['communication', 'logistics'], availability: 'offline', trustScore: 64, rating: 3.9, completed: 8, ngo: 'Apnalaya', lng: 72.8430, lat: 19.0610, status: 'approved', verified: true },
    // Two pending volunteers so the ADMIN approval queue is not empty either.
    { name: 'Vikram Rane', email: `vikram${DEMO_EMAIL_DOMAIN}`, phone: '+919810000015', skills: ['rescue'], availability: 'offline', trustScore: 50, rating: null, completed: 0, ngo: null, lng: 72.8800, lat: 19.0690, status: 'pending', verified: false },
    { name: 'Meera Joshi', email: `meera${DEMO_EMAIL_DOMAIN}`, phone: '+919810000016', skills: ['medical'], availability: 'offline', trustScore: 50, rating: null, completed: 0, ngo: 'SNEHA', lng: 72.8660, lat: 19.0190, status: 'pending', verified: false },
  ];

  const volunteers = [];
  for (const spec of volunteerSpecs) {
    const user = await upsertUser({ name: spec.name, email: spec.email, role: 'volunteer', phone: spec.phone, lng: spec.lng, lat: spec.lat });
    let vol = await Volunteer.findOne({ user: user._id });
    if (!vol) vol = new Volunteer({ user: user._id });
    Object.assign(vol, {
      skills: spec.skills,
      ngoAffiliation: spec.ngo,
      verified: spec.verified,
      status: spec.status,
      trustScore: spec.trustScore,
      rating: spec.rating,
      completedTasksCount: spec.completed,
      availability: spec.availability,
      currentLocation: point(spec.lng, spec.lat),
      serviceRadiusKm: 8,
    });
    await vol.save();
    volunteers.push(vol);
  }
  log(`users: 1 authority, 1 admin, ${volunteers.length} volunteers`);

  const citizenSpecs = [
    { name: 'Rahul Verma', email: `rahul${DEMO_EMAIL_DOMAIN}`, phone: '+919810000020', lng: 72.8506, lat: 19.0380 },
    { name: 'Asha Pawar', email: `asha${DEMO_EMAIL_DOMAIN}`, phone: '+919810000021', lng: 72.9200, lat: 19.0530 },
    { name: 'Kiran More', email: `kiran${DEMO_EMAIL_DOMAIN}`, phone: '+919810000022', lng: 72.8790, lat: 19.0680 },
  ];
  const citizens = [];
  for (const c of citizenSpecs) {
    citizens.push(await upsertUser({ ...c, role: 'citizen' }));
  }

  // ----------------------------------------------------------- risk zones
  const zones = [];
  for (const z of ZONES) {
    const zone = new RiskZone({
      blockId: z.blockId,
      name: z.name,
      settlement: z.settlement,
      geometry: squareAround(z.lng, z.lat),
      hazardType: z.hazardType,
      riskScore: z.riskScore, // riskLevel is derived by the pre-save hook
      confidence: z.confidence,
      populationEstimate: z.populationEstimate,
      dataSource: 'satellite',
      lastAnalyzedAt: new Date(),
      contributingFactors: [
        { factor: 'rainfall_24h', weight: 0.4 },
        { factor: 'drainage_capacity', weight: 0.35 },
        { factor: 'population_density', weight: 0.25 },
      ],
      createdBy: authority._id,
    });
    await zone.save();
    zones.push(zone);
  }
  const byBlock = Object.fromEntries(zones.map((z) => [z.blockId, z]));
  log(`risk zones: ${zones.length} (${zones.filter((z) => ['high', 'critical'].includes(z.riskLevel)).length} high/critical -> feed Recent alerts)`);

  // ------------------------------------------------------------ incidents
  // Spread across the last 7 days so the trend chart has a real curve, and
  // mixed active/resolved so Severity mix + Zone load both have content.
  const incidentSpecs = [
    { title: 'Waterlogging near Dharavi main drain', type: 'flood', severity: 'critical', status: 'active', zone: 'DEMO-DHARAVI-01', days: 0, pop: 1800, desc: 'Drainage channel overflowing after 140mm rainfall. Ground-floor homes flooded.' },
    { title: 'Fire outbreak in recycling shed', type: 'fire', severity: 'high', status: 'active', zone: 'DEMO-DHARAVI-02', days: 0, pop: 450, desc: 'Fire spreading through plastic recycling units. Fire services notified.' },
    { title: 'Sewage overflow at Govandi East', type: 'flood', severity: 'high', status: 'active', zone: 'DEMO-GOVANDI-01', days: 1, pop: 1200, desc: 'Contaminated water entering lanes; disease risk elevated.' },
    { title: 'Partial wall collapse, transit camp', type: 'structural_collapse', severity: 'critical', status: 'active', zone: 'DEMO-MANKHURD-01', days: 1, pop: 300, desc: 'Boundary wall collapsed after sustained rain. Two structures unsafe.' },
    { title: 'Slope erosion warning, Bandra East', type: 'landslide', severity: 'medium', status: 'active', zone: 'DEMO-BANDRA-01', days: 2, pop: 560, desc: 'Soil movement detected on slope above settlement.' },
    { title: 'Pipeline Road street flooding', type: 'flood', severity: 'medium', status: 'active', zone: 'DEMO-KURLA-01', days: 2, pop: 900, desc: 'Knee-deep water blocking primary access road.' },
    { title: 'Blocked drainage cleared, Wadala', type: 'flood', severity: 'low', status: 'resolved', zone: 'DEMO-WADALA-01', days: 3, pop: 200, desc: 'Municipal team cleared silt blockage. Water receded.' },
    { title: 'Electrical short circuit, Sion', type: 'fire', severity: 'medium', status: 'resolved', zone: 'DEMO-SION-01', days: 4, pop: 150, desc: 'Exposed wiring caused localized fire. Contained by residents.' },
    { title: 'Minor flooding, Dharavi Sector 4', type: 'flood', severity: 'low', status: 'resolved', zone: 'DEMO-DHARAVI-02', days: 5, pop: 320, desc: 'Temporary waterlogging resolved after pumping.' },
    { title: 'Structural crack survey, Mankhurd', type: 'structural_collapse', severity: 'medium', status: 'resolved', zone: 'DEMO-MANKHURD-01', days: 6, pop: 240, desc: 'Survey completed; two units marked for repair.' },
    { title: 'Drain cleaning drive, Govandi', type: 'flood', severity: 'low', status: 'resolved', zone: 'DEMO-GOVANDI-01', days: 6, pop: 180, desc: 'Preventive clearing ahead of forecast rainfall.' },
  ];

  const incidents = [];
  for (const spec of incidentSpecs) {
    const zone = byBlock[spec.zone];
    const zoneSpec = ZONES.find((z) => z.blockId === spec.zone);
    const when = daysAgo(spec.days);
    const inc = new Incident({
      title: spec.title,
      type: spec.type,
      severity: spec.severity,
      status: spec.status,
      riskZone: zone._id,
      location: point(zoneSpec.lng, zoneSpec.lat),
      description: spec.desc,
      affectedPopulationEstimate: spec.pop,
      reportedBy: citizens[0]._id,
      verifiedBy: authority._id,
      startedAt: when,
      resolvedAt: spec.status === 'resolved' ? new Date(when.getTime() + 6 * 3600 * 1000) : null,
    });
    await inc.save();
    await backdate(Incident, inc._id, when);
    incidents.push(inc);
  }
  log(`incidents: ${incidents.length} (${incidents.filter((i) => i.status === 'active').length} active -> Severity mix; spread over 7 days -> trend chart)`);

  // ------------------------------------------------------- citizen reports
  // status='pending' is exactly what the authority Task approval queue lists.
  // Photos use real public URLs so the evidence thumbnails actually render
  // without Cloudinary credentials configured.
  const PHOTO = (id) => ({
    url: `https://images.unsplash.com/photo-${id}?w=600&q=70&auto=format&fit=crop`,
    publicId: `demo/${id}`,
    mimeType: 'image/jpeg',
    sizeBytes: 148000,
  });

  const reportSpecs = [
    { reporter: 0, zone: 'DEMO-DHARAVI-01', hazardType: 'flood', severity: 'critical', status: 'pending', days: 0, desc: 'Water entered our lane, knee deep near the community tap.', photos: ['1547683905-f686c993aae5'] },
    { reporter: 1, zone: 'DEMO-GOVANDI-01', hazardType: 'blocked_drainage', severity: 'high', status: 'pending', days: 0, desc: 'Drain fully blocked with silt, water backing into homes.', photos: ['1583266983-fdd5b6b3a4d5'] },
    { reporter: 2, zone: 'DEMO-KURLA-01', hazardType: 'fire', severity: 'high', status: 'pending', days: 1, desc: 'Smoke coming from electric pole near the shop row.', photos: ['1486551937199-baf066858de7'] },
    { reporter: 0, zone: 'DEMO-DHARAVI-02', hazardType: 'structural', severity: 'medium', status: 'verified', days: 2, desc: 'Crack widening on the shared wall between two homes.', photos: [] },
    { reporter: 1, zone: 'DEMO-MANKHURD-01', hazardType: 'flood', severity: 'medium', status: 'verified', days: 3, desc: 'Standing water not draining for three days.', photos: [] },
    { reporter: 2, zone: 'DEMO-WADALA-01', hazardType: 'blocked_drainage', severity: 'low', status: 'resolved', days: 5, desc: 'Drain was cleared by municipal team, issue resolved.', photos: [] },
  ];

  let reportCount = 0;
  for (const spec of reportSpecs) {
    const zone = byBlock[spec.zone];
    const zoneSpec = ZONES.find((z) => z.blockId === spec.zone);
    const when = daysAgo(spec.days);
    const report = new CitizenReport({
      reporter: citizens[spec.reporter]._id,
      riskZone: zone._id,
      hazardType: spec.hazardType,
      severity: spec.severity,
      description: spec.desc,
      photos: spec.photos.map(PHOTO),
      location: point(zoneSpec.lng, zoneSpec.lat),
      reliabilityScore: spec.status === 'verified' ? 82 : 61,
      status: spec.status,
      verifiedBy: spec.status === 'pending' ? null : authority._id,
      upvotes: Math.floor(Math.random() * 12),
    });
    await report.save();
    await backdate(CitizenReport, report._id, when);
    reportCount += 1;
  }
  log(`citizen reports: ${reportCount} (${reportSpecs.filter((r) => r.status === 'pending').length} pending -> Task approval queue, with photo evidence)`);

  // ----------------------------------------------------------------- tasks
  // Open tasks feed the volunteer dashboard's "nearby requests" browser.
  const activeIncidents = incidents.filter((i) => i.status === 'active');
  const taskSpecs = [
    { title: 'Evacuate ground-floor families to shelter', taskType: 'evacuation_assist', priority: 'critical', skills: ['rescue'], status: 'open', incidentIdx: 0 },
    { title: 'Set up medical post at community hall', taskType: 'medical', priority: 'high', skills: ['medical'], status: 'open', incidentIdx: 0 },
    { title: 'Distribute drinking water packets', taskType: 'logistics', priority: 'high', skills: ['logistics'], status: 'open', incidentIdx: 2 },
    { title: 'Clear debris from access lane', taskType: 'drainage_clearance', priority: 'medium', skills: ['construction'], status: 'open', incidentIdx: 3 },
    { title: 'Damage survey of affected structures', taskType: 'damage_assessment', priority: 'medium', skills: ['construction'], status: 'open', incidentIdx: 4 },
    { title: 'Coordinate fire service access route', taskType: 'logistics', priority: 'critical', skills: ['communication'], status: 'assigned', incidentIdx: 1, assignee: 1 },
    { title: 'First aid for smoke inhalation cases', taskType: 'medical', priority: 'high', skills: ['medical'], status: 'completed', incidentIdx: 1, assignee: 0 },
  ];

  let taskCount = 0;
  for (const spec of taskSpecs) {
    const inc = activeIncidents[spec.incidentIdx % activeIncidents.length];
    const zoneSpec = ZONES.find((z) => String(byBlock[z.blockId]._id) === String(inc.riskZone));
    const assignedVolunteer = spec.assignee !== undefined ? volunteers[spec.assignee]._id : null;
    const now = new Date();
    const task = new Task({
      title: spec.title,
      description: `${spec.title} for incident: ${inc.title}`,
      incident: inc._id,
      riskZone: inc.riskZone,
      taskType: spec.taskType,
      priority: spec.priority,
      status: spec.status,
      requiredSkills: spec.skills,
      location: point(zoneSpec.lng, zoneSpec.lat),
      assignedVolunteer,
      estimatedTimeMinutes: 45 + Math.floor(Math.random() * 90),
      acceptedAt: spec.status === 'open' ? null : now,
      startedAt: spec.status === 'completed' ? now : null,
      completedAt: spec.status === 'completed' ? now : null,
    });
    await task.save();
    taskCount += 1;
  }
  log(`tasks: ${taskCount} (${taskSpecs.filter((t) => t.status === 'open').length} open -> volunteer "nearby requests")`);

  // --------------------------------------------------------- notifications
  const notifSpecs = [
    { recipient: authority._id, type: 'alert', title: 'Critical flood risk — Dharavi Sector 1', message: 'Risk score rose to 88. Immediate review recommended.', priority: 'urgent' },
    { recipient: authority._id, type: 'report_status', title: '3 reports awaiting verification', message: 'New citizen reports submitted in the last 24 hours.', priority: 'high' },
    { recipient: authority._id, type: 'alert', title: 'Fire reported — Dharavi Sector 4', message: 'Recycling shed fire reported; fire services notified.', priority: 'urgent' },
    { recipient: volunteers[0].user, type: 'task_assigned', title: 'New task near you', message: 'Evacuation assistance needed at Dharavi Sector 1.', priority: 'high' },
    { recipient: citizens[0]._id, type: 'report_status', title: 'Your report is under review', message: 'An authority is reviewing your flood report.', priority: 'normal' },
  ];
  await Notification.deleteMany({ recipient: { $in: [authority._id, admin._id, ...citizens.map((c) => c._id), ...volunteers.map((v) => v.user)] } });
  for (const n of notifSpecs) {
    await Notification.create({ ...n, channel: 'in_app', isRead: false });
  }
  log(`notifications: ${notifSpecs.length}`);

  // ------------------------------------------------------------- summary
  const [zoneTotal, incidentTotal, activeTotal, volTotal, pendingReports, openTasks] = await Promise.all([
    RiskZone.countDocuments(),
    Incident.countDocuments(),
    Incident.countDocuments({ status: 'active' }),
    Volunteer.countDocuments(),
    CitizenReport.countDocuments({ status: 'pending' }),
    Task.countDocuments({ status: 'open' }),
  ]);

  console.log('\n================ SEED COMPLETE ================');
  console.log(`  Risk zones ............ ${zoneTotal}   -> heatmap + alerts`);
  console.log(`  Incidents ............. ${incidentTotal}  (${activeTotal} active) -> feed, severity mix, trend`);
  console.log(`  Volunteers ............ ${volTotal}   -> volunteer summary`);
  console.log(`  Pending reports ....... ${pendingReports}   -> approval queue`);
  console.log(`  Open tasks ............ ${openTasks}   -> volunteer nearby requests`);
  console.log('\n  Demo logins (password: Demo@12345)');
  console.log(`    authority${DEMO_EMAIL_DOMAIN}`);
  console.log(`    admin${DEMO_EMAIL_DOMAIN}`);
  console.log(`    priya${DEMO_EMAIL_DOMAIN}    (volunteer)`);
  console.log(`    rahul${DEMO_EMAIL_DOMAIN}    (citizen)`);
  console.log('===============================================\n');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('[seed] FAILED:', err.message);
  if (err.errors) {
    for (const [field, e] of Object.entries(err.errors)) console.error(`  - ${field}: ${e.message}`);
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
