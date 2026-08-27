import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  hotelName: string;

  /** Must match a registered adapter's siteType, e.g. "gommt" or "swiftbook". */
  @IsString()
  @IsNotEmpty()
  siteType: string;

  /** Adapter-specific config — for "gommt" this can be omitted; for "swiftbook" it needs
   *  { baseUrl, propertyId, roomIds, ... } (see SwiftbookSiteConfig). */
  @IsOptional()
  @IsObject()
  siteConfig?: Record<string, unknown>;

  /** Required only for adapters where requiresLogin is true (e.g. "gommt"). */
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
