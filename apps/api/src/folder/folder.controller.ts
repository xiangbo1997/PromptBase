import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { CreateFolderDto } from './dto/create-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderService } from './folder.service';

@Controller('orgs/:orgId/folders')
@UseGuards(AuthGuard, OrgMemberGuard)
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFolderDto,
  ) {
    return this.folderService.create(orgId, user.id, dto);
  }

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.folderService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.folderService.findOne(orgId, id);
  }

  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateFolderDto) {
    return this.folderService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.folderService.remove(orgId, id);
  }

  @Post(':id/move')
  move(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: MoveFolderDto) {
    return this.folderService.move(orgId, id, dto.parentId ?? null);
  }
}
