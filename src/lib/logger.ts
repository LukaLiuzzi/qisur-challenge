import winston from 'winston';
import Transport from 'winston-transport';
import prisma from './prisma';

class PrismaTransport extends Transport {
  log(info: any, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));
    const {
      level,
      message,
      [Symbol.for('level')]: _lvl,
      [Symbol.for('splat')]: _splat,
      ...rest
    } = info;
    const meta = Object.keys(rest).length > 0 ? rest : undefined;
    try {
      prisma.log.create({ data: { level, message, meta: meta as any } }).catch(() => {});
    } catch {}
    callback();
  }
}

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
);

const logger = winston.createLogger({
  level: 'http',
  silent: process.env.NODE_ENV === 'test',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [new winston.transports.Console({ format: consoleFormat })],
});

if (process.env.NODE_ENV !== 'test') {
  logger.add(new PrismaTransport());
}

export default logger;
