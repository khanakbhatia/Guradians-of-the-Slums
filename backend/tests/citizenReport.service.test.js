process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const CitizenReport = require('../models/CitizenReport.model');
const citizenReportService = require('../services/citizenReport.service');

describe('citizenReport.service', () => {
  const originalFind = CitizenReport.find;
  const originalCountDocuments = CitizenReport.countDocuments;

  beforeEach(() => {
    CitizenReport.find = originalFind;
    CitizenReport.countDocuments = originalCountDocuments;
  });

  afterAll(() => {
    CitizenReport.find = originalFind;
    CitizenReport.countDocuments = originalCountDocuments;
  });

  function mockReportFind() {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    CitizenReport.find = jest.fn().mockReturnValue(chain);
    CitizenReport.countDocuments = jest.fn().mockResolvedValue(0);
    return chain;
  }

  it('scopes citizen report lists to the authenticated citizen', async () => {
    mockReportFind();
    const actor = { id: '507f1f77bcf86cd799439201', role: 'citizen' };

    await citizenReportService.listReports({ status: 'pending' }, actor);

    expect(CitizenReport.find).toHaveBeenCalledWith({
      status: 'pending',
      reporter: actor.id,
    });
  });

  it('does not reporter-scope authority report lists', async () => {
    mockReportFind();

    await citizenReportService.listReports({ status: 'pending' }, {
      id: '507f1f77bcf86cd799439202',
      role: 'authority',
    });

    expect(CitizenReport.find).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('rejects image upload requests with no files', async () => {
    await expect(
      citizenReportService.uploadReportImages('507f1f77bcf86cd799439203', { id: 'u1', role: 'citizen' }, [])
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'At least one image file is required (field name: "photos")',
    });
  });
});
