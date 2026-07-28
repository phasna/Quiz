import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  questionId!: number;

  @IsString()
  @IsNotEmpty()
  selectedAnswer!: string;

  @IsOptional()
  @IsInt()
  userId?: number;
}