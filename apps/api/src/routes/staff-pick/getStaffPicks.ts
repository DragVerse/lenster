import logger from '@hey/lib/logger';
import catchedError from '@utils/catchedError';
import { SWR_CACHE_AGE_10_MINS_30_DAYS } from '@utils/constants';
import prisma from '@utils/prisma';
import redisPool from '@utils/redisPool';
import type { Handler } from 'express';

export const get: Handler = async (req, res) => {
  try {
    const redis = await redisPool.getConnection();
    const cache = await redis.get('staff-picks');

    if (cache) {
      logger.info('Staff picks fetched from cache');
      return res
        .status(200)
        .setHeader('Cache-Control', SWR_CACHE_AGE_10_MINS_30_DAYS)
        .json({ success: true, cached: true, result: JSON.parse(cache) });
    }

    const data = await prisma.staffPick.findMany({
      where: { score: { not: 0 } },
      orderBy: { score: 'desc' },
      take: 5
    });
    await redis.set('staff-picks', JSON.stringify(data));
    logger.info('Staff picks fetched from DB');

    return res
      .status(200)
      .setHeader('Cache-Control', SWR_CACHE_AGE_10_MINS_30_DAYS)
      .json({ success: true, result: data });
  } catch (error) {
    return catchedError(res, error);
  }
};