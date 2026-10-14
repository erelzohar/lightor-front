import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import siteAssistantService, { HISTORY_TURN_MAX, type AssistantTurn } from '../../services/SiteAssistantService';
import globals from '../../services/globals';

/**
 * LT-315 (review, front Low): the server refuses a history turn over 1500
 * characters, so one long reply from Lighty used to turn every later
 * question into a 400.
 */
describe('SiteAssistantService.ask', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(axios); });
  afterEach(() => { mock.restore(); });

  it('sends the newest six turns, each cut to the server cap', async () => {
    mock.onPost(`${globals.siteAssistantUrl}/salon/chat`).reply(200, { success: true, data: { reply: 'Sure' } });
    const history: AssistantTurn[] = Array.from({ length: 8 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user',
      text: i === 7 ? 'x'.repeat(4000) : `turn ${i}`,
    }));

    await expect(siteAssistantService.ask('salon', 'And on Sunday?', history, 'en')).resolves.toEqual({ ok: true, reply: 'Sure' });

    const sent = JSON.parse(mock.history.post[0].data).history as AssistantTurn[];
    expect(sent).toHaveLength(6);
    expect(sent[0]).toEqual({ role: 'user', text: 'turn 2' });
    expect(sent[5].text).toHaveLength(HISTORY_TURN_MAX);
    expect(sent.every((turn) => turn.text.length <= HISTORY_TURN_MAX)).toBe(true);
  });
});
