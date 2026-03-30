import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { EventStateService } from './state/event-state.service';
import { SponsorTier } from '../sponsors/entities/sponsor-tier.entity';
import { UploadService } from '../common/upload/upload.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(SponsorTier)
    private readonly tierRepository: Repository<SponsorTier>,
    private readonly eventStateService: EventStateService,
    private readonly uploadService: UploadService,
  ) {}

  async createEvent(dto: CreateEventDto, organizerId: string): Promise<Event> {
    const event = this.eventRepository.create({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      organizerId,
    });
    return this.eventRepository.save(event);
  }

  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.getEventById(id);

    // Validate state transition before applying any updates
    if (dto.status !== undefined && dto.status !== event.status) {
      this.eventStateService.validateTransition(event.status, dto.status);
    }

    const updates: Partial<Event> = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.ticketPrice !== undefined && { ticketPrice: dto.ticketPrice }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
    };

    Object.assign(event, updates);
    return this.eventRepository.save(event);
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.getEventById(id);
    await this.eventRepository.remove(event);
  }

  async getEventById(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }
    return event;
  }

  async listEvents(filterDto: ListEventsDto): Promise<PaginatedResult<Event>> {
    const { status, organizerId, search, page = 1, limit = 10 } = filterDto;

    const where: FindOptionsWhere<Event> = {
      ...(status && { status }),
      ...(organizerId && { organizerId }),
      ...(search && { title: Like(`%${search}%`) }),
    };

    const [data, total] = await this.eventRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateEventImage(
    id: string,
    file: Express.Multer.File,
    callerId: string,
  ): Promise<Event> {
    const event = await this.getEventById(id);
    if (event.organizerId !== callerId) throw new ForbiddenException();
    event.imageUrl = await this.uploadService.saveFile(file);
    return this.eventRepository.save(event);
  }

  async duplicateEvent(
    id: string,
    dto: DuplicateEventDto,
    callerId: string,
  ): Promise<Event> {
    const source = await this.getEventById(id);
    if (source.organizerId !== callerId) throw new ForbiddenException();

    const duplicate = this.eventRepository.create({
      title: dto.title ?? `${source.title} (Copy)`,
      description: source.description,
      location: source.location,
      ticketPrice: source.ticketPrice,
      currency: source.currency,
      maxAttendees: source.maxAttendees,
      category: source.category,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      organizerId: callerId,
      status: EventStatus.DRAFT,
    });
    const saved = await this.eventRepository.save(duplicate);

    const tiers = await this.tierRepository.find({ where: { eventId: id } });
    for (const tier of tiers) {
      await this.tierRepository.save(
        this.tierRepository.create({
          ...tier,
          id: undefined,
          eventId: saved.id,
        }),
      );
    }

    return saved;
  }
}