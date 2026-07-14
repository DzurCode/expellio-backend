import { PartialType } from '@nestjs/swagger';
import { CreateGoalContributionDto } from './create-goal-contribution.dto';

export class UpdateGoalContributionDto extends PartialType(CreateGoalContributionDto) {}
