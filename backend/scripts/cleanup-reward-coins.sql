-- 清理货币系统：移除所有学习币奖励，统一使用积分
-- 执行时间：2025-01-28

BEGIN;

-- 1. 清空成就表的学习币奖励
UPDATE "Achievement" SET "rewardCoins" = 0 WHERE "rewardCoins" > 0;

-- 2. 清空挑战模板的学习币奖励
UPDATE "ChallengeTemplate" SET "rewardCoins" = 0 WHERE "rewardCoins" > 0;

-- 查看修改结果
SELECT 'Achievement' as table_name,
       COUNT(*) as total_count,
       SUM(CASE WHEN "rewardCoins" > 0 THEN 1 ELSE 0 END) as has_coins_count,
       SUM("rewardPoints") as total_points,
       SUM("rewardCoins") as total_coins
FROM "Achievement"
UNION ALL
SELECT 'ChallengeTemplate' as table_name,
       COUNT(*) as total_count,
       SUM(CASE WHEN "rewardCoins" > 0 THEN 1 ELSE 0 END) as has_coins_count,
       SUM("rewardPoints") as total_points,
       SUM("rewardCoins") as total_coins
FROM "ChallengeTemplate";

COMMIT;

-- 执行说明：
-- docker exec -i children-growth-db psql -U postgres -d children_growth < backend/scripts/cleanup-reward-coins.sql
