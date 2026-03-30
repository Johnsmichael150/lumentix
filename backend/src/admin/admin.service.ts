import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/pagination/pagination.helper';
import { PaginatedResult } from '../common/pagination/interfaces/paginated-result.interface';
import { User } from '../users/entities/user.entity';
import { Event, EventStatus } from '../events/entities/event.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { ListAdminEventsDto } from './dto/list-admin-events.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ── Events ────────────────────────────────────────────────────────────────

  async approveEvent(eventId: string): Promise<Event> {
    const event = await this.findEventOrFail(eventId);

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        `Only draft events can be approved. Current status: "${event.status}".`,
      );
    }

    event.status = EventStatus.PUBLISHED;
    return this.eventRepository.save(event);
  }

  async suspendEvent(eventId: string): Promise<Event> {
    const event = await this.findEventOrFail(eventId);

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Event is already cancelled.');
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException('Completed events cannot be suspended.');
    }

    event.status = EventStatus.CANCELLED;
    return this.eventRepository.save(event);
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async blockUser(userId: string): Promise<User> {
    const user = await this.findUserOrFail(userId);

    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('User is already blocked.');
    }

    user.status = UserStatus.BLOCKED;
    return this.userRepository.save(user);
  }

  async unblockUser(userId: string): Promise<User> {
    const user = await this.findUserOrFail(userId);

    if (user.status !== UserStatus.BLOCKED) {
      throw new BadRequestException('User is not blocked.');
    }

    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }

  async listUsers(dto: ListAdminUsersDto): Promise<PaginatedResult<User>> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.role',
        'user.status',
        'user.stellarPublicKey',
        'user.balances',
        'user.balancesUpdatedAt',
        'user.notificationPreferences',
        'user.createdAt',
        'user.updatedAt',
      ]);

    if (dto.role) {
      qb.andWhere('user.role = :role', { role: dto.role });
    }

    if (dto.status) {
      qb.andWhere('user.status = :status', { status: dto.status });
    }

    return paginate(qb, dto, 'user');
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.role',
        'user.status',
        'user.stellarPublicKey',
        'user.balances',
        'user.balancesUpdatedAt',
        'user.notificationPreferences',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User "${userId}" not found.`);
    }

    return user;
  }

  async listAllEvents(
    dto: ListAdminEventsDto,
  ): Promise<PaginatedResult<Event>> {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndMapOne(
        'event.organizer',
        User,
        'organizer',
        'organizer.id = event.organizerId',
      )
      .select([
        'event',
        'organizer.id',
        'organizer.email',
        'organizer.role',
        'organizer.status',
        'organizer.stellarPublicKey',
        'organizer.createdAt',
        'organizer.updatedAt',
      ]);

    if (dto.status) {
      qb.andWhere('event.status = :status', { status: dto.status });
    }

    return paginate(qb, dto, 'event');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findEventOrFail(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event "${id}" not found.`);
    return event;
  }

  private async findUserOrFail(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User "${id}" not found.`);
    return user;
  }
}
