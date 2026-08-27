import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelSessionEntity } from '../../database/entities/hotel-session.entity';
import { decrypt, encrypt } from '../../common/crypto.util';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(HotelSessionEntity)
    private readonly sessions: Repository<HotelSessionEntity>,
    private readonly engine: EngineService,
    private readonly config: ConfigService,
  ) {}

  private get key(): string {
    return this.config.get<string>('credentialsEncryptionKey')!;
  }

  async list(): Promise<HotelSessionEntity[]> {
    return this.sessions.find();
  }

  async findOrThrow(id: string): Promise<HotelSessionEntity> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async create(hotelName: string, username: string, password: string): Promise<HotelSessionEntity> {
    let session = this.sessions.create({
      hotelName,
      gommtUsernameEncrypted: encrypt(username, this.key),
      gommtPasswordEncrypted: encrypt(password, this.key),
      status: 'pending_otp',
    });
    session = await this.sessions.save(session);

    const result = await this.engine.startLogin(session.id, username, password);
    if (result.status === 'login_failed') {
      session.status = 'login_failed';
      session.lastError = result.error ?? null;
    } else if (result.status === 'active') {
      // A reused storage state can skip the OTP step entirely.
      const state = await this.engine.saveStorageState(session.id);
      session.browserStateEncrypted = state ? encrypt(state, this.key) : null;
      session.status = 'active';
      session.lastLoginAt = new Date();
      session.lastError = null;
    } else {
      session.status = 'pending_otp';
    }
    return this.sessions.save(session);
  }

  async submitOtp(id: string, otp: string): Promise<HotelSessionEntity> {
    const session = await this.findOrThrow(id);
    if (session.status !== 'pending_otp') {
      throw new BadRequestException(`Session ${id} is not awaiting an OTP (status: ${session.status})`);
    }

    const result = await this.engine.submitOtp(id, otp);
    if (result.status === 'active') {
      const state = await this.engine.saveStorageState(id);
      session.browserStateEncrypted = state ? encrypt(state, this.key) : null;
      session.status = 'active';
      session.lastLoginAt = new Date();
      session.lastError = null;
    } else {
      session.status = 'login_failed';
      session.lastError = result.error ?? null;
    }
    return this.sessions.save(session);
  }

  decryptCredentials(session: HotelSessionEntity): { username: string; password: string } {
    return {
      username: decrypt(session.gommtUsernameEncrypted, this.key),
      password: decrypt(session.gommtPasswordEncrypted, this.key),
    };
  }

  decryptStorageState(session: HotelSessionEntity): string | undefined {
    return session.browserStateEncrypted ? decrypt(session.browserStateEncrypted, this.key) : undefined;
  }

  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.engine.closeSession(id);
    await this.sessions.delete(id);
  }
}
