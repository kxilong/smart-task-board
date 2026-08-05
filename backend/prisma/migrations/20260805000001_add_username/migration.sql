-- AddUsername
-- 阶段：由邮箱登录改为用户名登录
-- 1. 新增 username 列（先 nullable，兼容已有数据）
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- 2. 为已有用户从 email 前缀生成 username（PostgreSQL 无 split_part 结果不一致时兜底）
UPDATE "User"
SET "username" = COALESCE(
    NULLIF(SPLIT_PART("email", '@', 1), ''),
    'user_' || SUBSTRING("id" FROM 1 FOR 8)
)
WHERE "username" IS NULL;

-- 3. 处理可能的重复 username：为重复项追加 _1, _2...
DO $$
DECLARE
    rec RECORD;
    cnt INT;
    new_username TEXT;
BEGIN
    FOR rec IN
        SELECT MIN("id") AS "id", "username"
        FROM "User"
        GROUP BY "username"
        HAVING COUNT(*) > 1
    LOOP
        cnt := 1;
        FOR rec IN
            SELECT "id", "username"
            FROM "User"
            WHERE "username" = rec."username"
            AND "id" != (SELECT MIN("id") FROM "User" WHERE "username" = rec."username")
        LOOP
            new_username := rec."username" || '_' || cnt;
            WHILE EXISTS (SELECT 1 FROM "User" WHERE "username" = new_username) LOOP
                cnt := cnt + 1;
                new_username := rec."username" || '_' || cnt;
            END LOOP;
            UPDATE "User" SET "username" = new_username WHERE "id" = rec."id";
            cnt := cnt + 1;
        END LOOP;
    END LOOP;
END $$;

-- 4. 将 username 设为 NOT NULL 并加唯一索引
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- 5. email 改为可空（保留唯一索引用于后续找回密码等场景）
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
