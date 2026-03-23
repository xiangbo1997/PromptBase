import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { FavoriteService } from './favorite.service';

@Controller('orgs/:orgId')
@UseGuards(AuthGuard, OrgMemberGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get('favorites')
  findAll(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.favoriteService.findAll(orgId, user.id);
  }

  @Post('prompts/:promptId/favorite')
  toggle(
    @Param('orgId') orgId: string,
    @Param('promptId') promptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.favoriteService.toggle(orgId, user.id, promptId);
  }

  @Delete('prompts/:promptId/favorite')
  remove(
    @Param('orgId') orgId: string,
    @Param('promptId') promptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.favoriteService.remove(orgId, user.id, promptId);
  }
}
