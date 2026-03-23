import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { ReorderPinsDto } from './dto/reorder-pins.dto';
import { PinService } from './pin.service';

@Controller('orgs/:orgId')
@UseGuards(AuthGuard, OrgMemberGuard)
export class PinController {
  constructor(private readonly pinService: PinService) {}

  @Get('pins')
  findAll(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pinService.findAll(orgId, user.id);
  }

  @Post('prompts/:promptId/pin')
  toggle(
    @Param('orgId') orgId: string,
    @Param('promptId') promptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pinService.toggle(orgId, user.id, promptId);
  }

  @Patch('pins/reorder')
  reorder(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderPinsDto,
  ) {
    return this.pinService.reorder(orgId, user.id, dto.promptIds);
  }

  @Delete('prompts/:promptId/pin')
  remove(
    @Param('orgId') orgId: string,
    @Param('promptId') promptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pinService.remove(orgId, user.id, promptId);
  }
}
