import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  inviteCode:
    process.env.INVITE_CODE ??
    (() => {
      throw new Error('INVITE_CODE is required');
    })(),
}));
