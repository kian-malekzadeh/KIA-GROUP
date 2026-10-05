import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

/**
 * KIA GROUP global search endpoint (spec §37).
 *
 * Authenticated so private drafts and user-scoped data can never leak through
 * search, and so per-user abuse is throttleable. Hits are always tagged with
 * their source department (`department`), so the UI can render the origin.
 */
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @CurrentUser('id') _userId: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    const hits = await this.searchService.search(
      q ?? '',
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
    return { hits, query: (q ?? '').trim() };
  }
}
