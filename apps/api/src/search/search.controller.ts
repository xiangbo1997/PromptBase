import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { SearchPromptsDto } from './dto/search-prompts.dto';
import { SearchService } from './search.service';

@Controller('orgs/:orgId/prompts/search')
@UseGuards(AuthGuard, OrgMemberGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: SearchPromptsDto,
  ) {
    return this.searchService.search(orgId, user.id, dto);
  }
}
