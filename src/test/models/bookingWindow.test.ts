import { describe, it, expect } from 'vitest';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

describe('WebsiteConfig booking window (LT-156)', () => {
  it("reads the owner's choice", () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingHorizonDays: 14 }).bookingHorizonDays).toBe(14);
  });

  it('falls back to sixty days when absent or nonsense', () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE }).bookingHorizonDays).toBe(60);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingHorizonDays: 0 }).bookingHorizonDays).toBe(60);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingHorizonDays: 2.5 }).bookingHorizonDays).toBe(60);
  });
});
