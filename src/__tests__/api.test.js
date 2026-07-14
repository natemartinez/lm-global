import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchPatients calls /api/dashboard', async () => {
    const { fetchPatients } = await import('../services/api');
    const mockData = [{ name: 'Jessica Taylor' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchPatients();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/dashboard',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(result).toEqual(mockData);
  });

  it('sets Content-Type header', async () => {
    const { fetchPatients } = await import('../services/api');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetchPatients();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('throws an error with status on non-ok response', async () => {
    const { fetchPatients } = await import('../services/api');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve(null),
    });

    await expect(fetchPatients()).rejects.toMatchObject({
      message: 'API Error: 500 Internal Server Error',
      status: 500,
    });
  });

  it('includes error data when server returns JSON error', async () => {
    const { fetchPatients } = await import('../services/api');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ message: 'Invalid request' }),
    });

    await expect(fetchPatients()).rejects.toMatchObject({
      status: 400,
      data: { message: 'Invalid request' },
    });
  });

  it('handles network failure', async () => {
    const { fetchPatients } = await import('../services/api');
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchPatients()).rejects.toThrow('Network error');
  });
});
