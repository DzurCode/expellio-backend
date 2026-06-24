import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateHouseholdDto } from './create-household.dto';

export class UpdateHouseholdDto extends PartialType(
  OmitType(CreateHouseholdDto, ['ownerId'] as const)
) {}
