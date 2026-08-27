import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelSessionEntity } from '../../database/entities/hotel-session.entity';
import { decrypt, encrypt } from '../../common/crypto.util';
import { AdapterRegistryService } from '../engine/adapter-registry.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(HotelSessionEntity)
    private readonly sessions: Repository<HotelSessionEntity>,
    private readonly engine: EngineService,
    private readonly adapters: AdapterRegistryService,
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

  async create(
    hotelName: string,
    siteType: string,
    siteConfig: Record<string, unknown> | undefined,
    username?: string,
    password?: string,
  ): Promise<HotelSessionEntity> {
    const adapter = this.adapters.get(siteType); // throws NotFoundException for unknown siteType
    if (adapter.requiresLogin && (!username || !password)) {
      throw new BadRequestException(`siteType "${siteType}" requires username and password`);
    }

    let session = this.sessions.create({
      hotelName,
      siteType,
      siteConfig: siteConfig ? JSON.stringify(siteConfig) : null,
      usernameEncrypted: username ? encrypt(username, this.key) : null,
      passwordEncrypted: password ? encrypt(password, this.key) : null,
      status: 'pending_otp',
    });
    session = await this.sessions.save(session);

    const result = await this.engine.startSession(
      session.id,
      siteType,
      siteConfig ?? {},
      adapter.requiresLogin ? { username: username!, password: password! } : undefined,
    );

    if (result.status === 'login_failed') {
      session.status = 'login_failed';
      session.lastError = result.error ?? null;
    } else if (result.status === 'active') {
      // Public sites, or a reused storage state that skipped the OTP step entirely.
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

    const result = await this.engine.submitOtp(id, session.siteType, otp);
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

  decryptCredentials(session: HotelSessionEntity): { username: string; password: string } | null {
    if (!session.usernameEncrypted || !session.passwordEncrypted) return null;
    return {
      username: decrypt(session.usernameEncrypted, this.key),
      password: decrypt(session.passwordEncrypted, this.key),
    };
  }

  decryptStorageState(session: HotelSessionEntity): string | undefined {
    return session.browserStateEncrypted ? decrypt(session.browserStateEncrypted, this.key) : undefined;
  }

  parseSiteConfig(session: HotelSessionEntity): Record<string, unknown> {
    return session.siteConfig ? JSON.parse(session.siteConfig) : {};
  }

  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.engine.closeSession(id);
    await this.sessions.delete(id);
  }
}
