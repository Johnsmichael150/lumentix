import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('events')
@UseGuards(RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ORGANIZER)
  create(@Body() dto: CreateEventDto, @Req() req: AuthenticatedRequest) {
    return this.eventsService.createEvent(dto, req.user.id);
  }

  @Get()
  list(@Query() filterDto: ListEventsDto) {
    return this.eventsService.listEvents(filterDto);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getEventById(id);
  }

  @Put(':id')
  @Roles(Role.ORGANIZER)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.updateEvent(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.deleteEvent(id);
  }

  @Post(':id/image')
  @Roles(Role.ORGANIZER)
  @UseInterceptors(FileInterceptor('image', { storage: undefined }))
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.updateEventImage(id, file, req.user.id);
  }

  @Post(':id/duplicate')
  @Roles(Role.ORGANIZER)
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.duplicateEvent(id, dto, req.user.id);
  }
}
