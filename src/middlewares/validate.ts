
import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export function validateBody(dtoClass: new () => object) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dto = plainToInstance(dtoClass, req.body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.flatMap(e => Object.values(e.constraints || {}))
      });
    }
    req.body = dto;
    next();
  };
}