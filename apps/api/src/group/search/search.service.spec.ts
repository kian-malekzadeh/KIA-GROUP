import { SearchService } from './search.service';
import type { SearchableProvider, SearchHit } from './search.types';

const hit = (department: SearchableProvider['department'], title: string): SearchHit => ({
  department,
  type: 'test',
  id: `${department}-1`,
  slug: null,
  title,
  description: null,
  url: '/',
});

const provider = (
  department: SearchableProvider['department'],
  results: SearchHit[],
  fail = false,
): SearchableProvider => ({
  department,
  type: 'test',
  search: fail
    ? () => Promise.reject(new Error('provider down'))
    : (query: string, limit: number) => {
        void query;
        void limit;
        return Promise.resolve(results);
      },
});

/** Cast a fake provider past the DI-typed constructor (tests, not runtime). */
const asProvider = <T>(value: unknown) => value as T;

describe('SearchService', () => {
  it('fans a query out to every registered provider and tags departments', async () => {
    const service = new SearchService(
      asProvider(provider('academy', [hit('academy', 'Next.js Course')])),
      asProvider(provider('events', [hit('events', 'Autumn Sprint')])),
    );

    const hits = await service.search('next');

    expect(hits.map((h) => [h.department, h.title])).toEqual([
      ['academy', 'Next.js Course'],
      ['events', 'Autumn Sprint'],
    ]);
  });

  it('keeps serving results when one provider fails', async () => {
    const service = new SearchService(
      asProvider(provider('academy', [hit('academy', 'Course')])),
      asProvider(provider('events', [], true)),
    );

    const hits = await service.search('anything');

    expect(hits).toHaveLength(1);
    expect(hits[0].department).toBe('academy');
  });

  it('caps per-provider results at the platform maximum', async () => {
    const many = Array.from({ length: 30 }, (_, i) => hit('academy', `Course ${i}`));
    const seenLimits: number[] = [];
    const service = new SearchService(
      asProvider({
        department: 'academy',
        type: 'test',
        search: (_q: string, limit: number) => {
          seenLimits.push(limit);
          return Promise.resolve(many.slice(0, limit));
        },
      }),
      asProvider(provider('events', [])),
    );

    const hits = await service.search('course', 99);

    expect(seenLimits).toEqual([10]);
    expect(hits).toHaveLength(10);
  });

  it('returns nothing for a blank query without touching providers', async () => {
    const search = jest.fn().mockResolvedValue([]);
    const service = new SearchService(
      asProvider({ department: 'academy', type: 'test', search }),
      asProvider(provider('events', [])),
    );

    await expect(service.search('   ')).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
