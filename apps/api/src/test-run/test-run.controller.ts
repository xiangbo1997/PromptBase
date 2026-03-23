import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { TestRunService } from './test-run.service';

@Controller('orgs/:orgId/test-runs')
@UseGuards(AuthGuard, OrgMemberGuard)
export class TestRunController {
  constructor(private readonly testRunService: TestRunService) {}

  @Post()
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTestRunDto,
  ) {
    return this.testRunService.create(orgId, user.id, dto);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.testRunService.findOne(orgId, id);
  }

  @Get(':id/stream')
  async stream(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ) {
    await this.testRunService.stream(orgId, id, reply);
  }
}
