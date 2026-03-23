import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagService } from './tag.service';

@Controller('orgs/:orgId/tags')
@UseGuards(AuthGuard, OrgMemberGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: CreateTagDto) {
    return this.tagService.create(orgId, dto);
  }

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.tagService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.tagService.findOne(orgId, id);
  }

  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.tagService.remove(orgId, id);
  }
}
