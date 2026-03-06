import { signToken } from '../config/jwt';

export function makeToken(role: 'ADMIN' | 'CLIENT' | 'VIEWER') {
  return signToken({ id: 1, email: `${role.toLowerCase()}@test.com`, role });
}
