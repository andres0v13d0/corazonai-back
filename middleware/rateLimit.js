import { LRUCache } from 'lru-cache';

const rateLimit = (options) => {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (res, limit, token) =>
      new Promise((resolve, reject) => {
        const current = tokenCache.get(token) || [0];
        current[0] += 1;
        tokenCache.set(token, current);

        const usage = current[0];
        const isRateLimited = usage > limit;

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - usage));

        return isRateLimited ? reject() : resolve();
      }),
  };
};

export default rateLimit;
