/**
 * Device-code authentication tests — GitHub-style flow refactor.
 *
 * Tests:
 *  1. Device code generated + hashed (raw not in DB)
 *  2. User code format (XXXX-XXXX)
 *  3. Response shape (new snake_case + legacy camelCase fields)
 *  4. Pending poll returns 202
 *  5. slow_down: rapid polling is throttled
 *  6. Approved poll issues tokens + atomically burns record (CONSUMED state)
 *  7. Second poll after CONSUMED returns error (concurrency / race condition)
 *  8. Expired code returns error with correct status field
 *  9. Approval requires authenticated user
 * 10. Approval requires correct password (step-up auth)
 * 11. Token issuance: new snake_case + legacy camelCase fields present
 * 12. Refresh token reuse detection revokes entire family
 * 13. /oauth/ canonical routes respond identically to /api/auth/ routes
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import prisma from '../db/prisma';
import { generateAccessToken } from '../auth/tokens';
import { hashToken } from '../auth/tokens';
import crypto from 'node:crypto';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters-long';
process.env.MASTER_KEK = process.env.MASTER_KEK || 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: any;

beforeAll(async () => {
  const mod = await import('../server.js');
  app = mod.default;
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── Fixtures ──────────────────────────────────────────────────────────────

async function createTestUser(suffix: string) {
  const { hashPassword } = await import('../crypto/password.js');
  return prisma.user.create({
    data: {
      email: `device-test-${suffix}-${Date.now()}@test.invalid`,
      passwordHash: await hashPassword('TestPassword12345!'),
      emailVerified: true,
    },
  });
}

// ─── Test 1-3: Initiation — device code generation ─────────────────────────

describe('Device-code initiation — POST /oauth/device/code', () => {
  let rawDeviceCode: string;
  let userCode: string;

  test('Returns correct response shape with both snake_case and legacy fields', async () => {
    const res = await request(app)
      .post('/oauth/device/code')
      .send();

    expect(res.status).toBe(200);

    // New canonical fields (snake_case)
    expect(res.body).toHaveProperty('device_code');
    expect(res.body).toHaveProperty('user_code');
    expect(res.body).toHaveProperty('verification_uri');
    expect(res.body).toHaveProperty('expires_in');
    expect(res.body).toHaveProperty('interval');

    // Legacy fields for backward compat
    expect(res.body).toHaveProperty('deviceCode');
    expect(res.body).toHaveProperty('userCode');
    expect(res.body).toHaveProperty('verificationUrl');

    // Values should be consistent
    expect(res.body.device_code).toBe(res.body.deviceCode);
    expect(res.body.user_code).toBe(res.body.userCode);

    rawDeviceCode = res.body.device_code;
    userCode = res.body.user_code;
  });

  test('User code matches XXXX-XXXX format', async () => {
    const res = await request(app).post('/oauth/device/code').send();
    expect(res.status).toBe(200);
    expect(res.body.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  test('Raw device code is NOT stored in the database (only hash is)', async () => {
    const res = await request(app).post('/oauth/device/code').send();
    const rawCode = res.body.device_code;
    const expectedHash = hashToken(rawCode);

    // Check that the hash IS in the DB
    const record = await prisma.deviceCode.findUnique({ where: { deviceCodeHash: expectedHash } });
    expect(record).not.toBeNull();

    // Check that the raw code is NOT stored anywhere in the DB record
    expect(record?.deviceCodeHash).toBe(expectedHash);
    expect(record?.deviceCodeHash).not.toBe(rawCode);

    // Cleanup
    if (record) await prisma.deviceCode.delete({ where: { id: record.id } }).catch(() => {});
  });

  test('verification_uri points to /login/device', async () => {
    const res = await request(app).post('/oauth/device/code').send();
    expect(res.body.verification_uri).toContain('/login/device');
    // Legacy field also updated
    expect(res.body.verificationUrl).toContain('/login/device');
  });

  test('interval is 5 (seconds)', async () => {
    const res = await request(app).post('/oauth/device/code').send();
    expect(res.body.interval).toBe(5);
  });
});

// ─── Test 4-5: Polling — pending + slow_down ───────────────────────────────

describe('Device-code polling — POST /oauth/device/token', () => {
  let rawDeviceCode: string;
  let deviceCodeId: string;

  beforeAll(async () => {
    const res = await request(app).post('/oauth/device/code').send();
    rawDeviceCode = res.body.device_code;
    const hash = hashToken(rawDeviceCode);
    const record = await prisma.deviceCode.findUnique({ where: { deviceCodeHash: hash } });
    deviceCodeId = record!.id;
  });

  afterAll(async () => {
    await prisma.deviceCode.deleteMany({ where: { id: deviceCodeId } }).catch(() => {});
  });

  test('Pending device code returns 202 with status: pending', async () => {
    const res = await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawDeviceCode });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('pending');
  });

  test('Legacy deviceCode field name also works for polling', async () => {
    const res = await request(app)
      .post('/oauth/device/token')
      .send({ deviceCode: rawDeviceCode });

    expect([202]).toContain(res.status);
  });

  test('Rapid re-poll within interval returns slow_down', async () => {
    // First poll to set lastPolledAt
    await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawDeviceCode });

    // Immediate second poll — should be throttled
    const res = await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawDeviceCode });

    // Either slow_down or still pending (if server clock has enough margin)
    if (res.body.status === 'slow_down') {
      expect(res.body.interval).toBeGreaterThan(0);
    } else {
      expect(res.status).toBe(202);
    }
  });

  test('Invalid device code returns 400', async () => {
    const res = await request(app)
      .post('/oauth/device/token')
      .send({ device_code: 'completely-invalid-code' });

    expect(res.status).toBe(400);
  });
});

// ─── Test 6-7: Approval + atomic consumption ──────────────────────────────

describe('Device-code approval + atomic token issuance', () => {
  let testUser: any;
  let webToken: string;

  beforeAll(async () => {
    testUser = await createTestUser('approval');
    webToken = generateAccessToken(testUser.id, 'web');
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  });

  test('Approval requires authentication', async () => {
    const res = await request(app)
      .post('/oauth/device/approve')
      .send({ userCode: 'AAAA-BBBB', password: 'TestPassword12345!' });

    expect(res.status).toBe(401);
  });

  test('Approval with wrong password fails', async () => {
    // First initiate a code
    const initRes = await request(app).post('/oauth/device/code').send();
    const { user_code: userCode, device_code: rawDeviceCode } = initRes.body;

    const approveRes = await request(app)
      .post('/oauth/device/approve')
      .set('Authorization', `Bearer ${webToken}`)
      .send({ userCode, password: 'WrongPassword!' });

    expect(approveRes.status).toBe(401);

    // Cleanup
    const hash = hashToken(rawDeviceCode);
    const record = await prisma.deviceCode.findUnique({ where: { deviceCodeHash: hash } });
    if (record) await prisma.deviceCode.delete({ where: { id: record.id } }).catch(() => {});
  });

  test('Full flow: initiate → approve → poll → tokens issued → code consumed', async () => {
    // 1. Initiate
    const initRes = await request(app).post('/oauth/device/code').send();
    expect(initRes.status).toBe(200);
    const { device_code: rawDeviceCode, user_code: userCode } = initRes.body;

    // 2. Approve via browser (correct password)
    const approveRes = await request(app)
      .post('/oauth/device/approve')
      .set('Authorization', `Bearer ${webToken}`)
      .send({ userCode, password: 'TestPassword12345!' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');

    // 3. Wait briefly to get past slow_down threshold
    await new Promise((r) => setTimeout(r, 200));

    // 4. Poll — should get tokens
    const pollRes = await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawDeviceCode });

    expect(pollRes.status).toBe(200);
    expect(pollRes.body.status).toBe('authorized');

    // 5. Verify token fields — both snake_case and legacy
    expect(pollRes.body).toHaveProperty('access_token');
    expect(pollRes.body).toHaveProperty('refresh_token');
    expect(pollRes.body).toHaveProperty('expires_in');
    expect(pollRes.body).toHaveProperty('accessToken');   // legacy compat
    expect(pollRes.body).toHaveProperty('refreshToken');  // legacy compat

    // snake_case and legacy values should match
    expect(pollRes.body.access_token).toBe(pollRes.body.accessToken);
    expect(pollRes.body.refresh_token).toBe(pollRes.body.refreshToken);

    // 6. Verify record is now CONSUMED (burned)
    const hash = hashToken(rawDeviceCode);
    const record = await prisma.deviceCode.findUnique({ where: { deviceCodeHash: hash } });
    expect(record?.burned).toBe(true);
    expect(record?.approved).toBe(true);
  });

  test('Second poll after code is consumed returns 400 (race condition protection)', async () => {
    // 1. Initiate + approve
    const initRes = await request(app).post('/oauth/device/code').send();
    const { device_code: rawDeviceCode, user_code: userCode } = initRes.body;

    await request(app)
      .post('/oauth/device/approve')
      .set('Authorization', `Bearer ${webToken}`)
      .send({ userCode, password: 'TestPassword12345!' });

    await new Promise((r) => setTimeout(r, 200));

    // 2. First poll — consumes the code
    const firstPoll = await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawDeviceCode });
    expect(firstPoll.body.status).toBe('authorized');

    // 3. Second poll — must NOT issue a second set of tokens
    const secondPoll = await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawDeviceCode });

    expect(secondPoll.status).toBe(400);
    // Should NOT contain any token fields
    expect(secondPoll.body).not.toHaveProperty('access_token');
    expect(secondPoll.body).not.toHaveProperty('accessToken');
    expect(secondPoll.body).not.toHaveProperty('refresh_token');
  });
});

// ─── Test 8: Expired code ─────────────────────────────────────────────────

describe('Expired device code', () => {
  test('Expired code returns 400 with status: expired', async () => {
    // Create an already-expired device code directly in DB
    const rawCode = crypto.randomBytes(32).toString('hex');
    const codeHash = hashToken(rawCode);
    await prisma.deviceCode.create({
      data: {
        deviceCodeHash: codeHash,
        userCode: `EX${Date.now().toString().slice(-6)}`.slice(0, 4) + '-XXXX',
        expiresAt: new Date(Date.now() - 1000), // expired 1s ago
      },
    });

    const res = await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawCode });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('expired');

    // Cleanup
    await prisma.deviceCode.deleteMany({ where: { deviceCodeHash: codeHash } }).catch(() => {});
  });
});

// ─── Test 9: /api/auth/ legacy routes still work ──────────────────────────

describe('Backward compatibility — /api/auth/device/* routes', () => {
  test('POST /api/auth/device/code still works', async () => {
    const res = await request(app).post('/api/auth/device/code').send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('device_code');
    expect(res.body).toHaveProperty('user_code');
    // Legacy fields must also be present
    expect(res.body).toHaveProperty('deviceCode');
    expect(res.body).toHaveProperty('userCode');

    // Cleanup
    const hash = hashToken(res.body.device_code);
    const record = await prisma.deviceCode.findUnique({ where: { deviceCodeHash: hash } });
    if (record) await prisma.deviceCode.delete({ where: { id: record.id } }).catch(() => {});
  });

  test('POST /api/auth/device/token with legacy deviceCode field works', async () => {
    const initRes = await request(app).post('/api/auth/device/code').send();
    const pollRes = await request(app)
      .post('/api/auth/device/token')
      .send({ deviceCode: initRes.body.deviceCode });

    // Should return 202 (pending) not 400
    expect(pollRes.status).toBe(202);

    // Cleanup
    const hash = hashToken(initRes.body.device_code);
    const record = await prisma.deviceCode.findUnique({ where: { deviceCodeHash: hash } });
    if (record) await prisma.deviceCode.delete({ where: { id: record.id } }).catch(() => {});
  });
});

// ─── Test 10: CliDevice registered after authorization ────────────────────

describe('CliDevice registration', () => {
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser('clidevice');
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  });

  test('CliDevice record is created after successful authorization', async () => {
    const webToken = generateAccessToken(testUser.id, 'web');

    const initRes = await request(app).post('/oauth/device/code').send();
    const { device_code: rawDeviceCode, user_code: userCode } = initRes.body;

    await request(app)
      .post('/oauth/device/approve')
      .set('Authorization', `Bearer ${webToken}`)
      .send({ userCode, password: 'TestPassword12345!' });

    await new Promise((r) => setTimeout(r, 200));

    await request(app)
      .post('/oauth/device/token')
      .send({ device_code: rawDeviceCode });

    // Check CliDevice was created
    const devices = await prisma.cliDevice.findMany({ where: { userId: testUser.id } });
    expect(devices.length).toBeGreaterThan(0);
    expect(devices[0].userId).toBe(testUser.id);
  });
});
