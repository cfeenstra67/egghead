import pino from 'pino';

export default pino({
  level: LOG_LEVEL,
  browser: {
    serialize: true
  }
});
