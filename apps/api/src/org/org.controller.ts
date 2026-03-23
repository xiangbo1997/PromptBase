import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/auth.guard';
import { InviteMemberDto } from './dto/invite-member.dto';
import { OrgMemberGuard, type OrgRequest } from './org.guard';
import { OrgService } from './org.service';

@Controller('orgs')
@UseGuards(AuthGuard, OrgMemberGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get(':orgId')
  getOrg(@Param('orgId') orgId: string) {
    return this.orgService.getOrg(orgId);
  }

  @Get(':orgId/members')
  getMembers(@Param('orgId') orgId: string) {
    return this.orgService.getMembers(orgId);
  }

  @Post(':orgId/members/invite')
  inviteMember(
    @Param('orgId') orgId: string,
    @Body() dto: InviteMemberDto,
    @Req() request: FastifyRequest & OrgRequest,
  ) {
    return this.orgService.inviteMember(orgId, dto, request.membership);
  }
}
