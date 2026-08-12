process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./data/test.db";
process.env.JWT_SECRET = "test-secret-at-least-16-chars-long";
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = "60000";
process.env.LOGIN_RATE_LIMIT_MAX = "5";
