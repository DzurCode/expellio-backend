import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinHouseholdDto {
  @ApiProperty({ description: 'Invite code to join a household' })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;

  @ApiProperty({ description: 'UUID of the user joining the household' })
  @IsUUID()
  userId: string;
}
