import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { PromptService } from './prompt.service';

@Controller('orgs/:orgId/prompts')
@UseGuards(AuthGuard, OrgMemberGuard)
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post()
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePromptDto,
  ) {
    return this.promptService.create(orgId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('tagId') tagId?: string,
    @Query('isTemplate') isTemplate?: string,
  ) {
    return this.promptService.findAll(orgId, user.id, {
      page: Number(page ?? '1'),
      pageSize: Number(pageSize ?? '20'),
      folderId,
      search,
      tagId,
      isTemplate: isTemplate === undefined ? undefined : isTemplate === 'true',
    });
  }

  @Get(':id/versions')
  listVersions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.promptService.listVersions(orgId, id, Number(page ?? '1'), Number(pageSize ?? '20'));
  }

  @Get(':id/versions/:versionId')
  findVersion(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.promptService.findVersion(orgId, id, versionId);
  }

  @Get(':id/versions/:versionId/diff')
  diffVersions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Query('compareWith') compareWith?: string,
  ) {
    return this.promptService.diffVersions(orgId, id, versionId, compareWith);
  }

  @Post(':id/restore/:versionId')
  restoreVersion(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.promptService.restoreVersion(orgId, id, versionId, user.id);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.promptService.findOne(orgId, id);
  }

  @Patch(':id')
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptService.update(orgId, id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.promptService.remove(orgId, id);
  }
}
